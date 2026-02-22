import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { SoilService } from './soil.service';

/**
 * Interface for AI service prediction request
 */
interface PredictionRequest {
  ph: number;
  soil_moisture: number;
  temperature: number;
  sunlight: number;
}

/**
 * Interface for AI service prediction response
 */
interface PredictionResponse {
  wilting_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
}

/**
 * Interface for combined prediction result
 */
export interface SoilPredictionResult {
  measurementId: string;
  wilting_score: number;
  risk_level: string;
  measurement_data: {
    ph: number;
    soil_moisture: number;
    temperature: number;
    sunlight: number;
    location: {
      latitude: number;
      longitude: number;
    };
    measured_at: Date;
  };
}

@Injectable()
export class SoilAiService {
  private readonly logger = new Logger(SoilAiService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly aiServiceUrl: string;

  constructor(
    private readonly soilService: SoilService,
    private readonly configService: ConfigService,
  ) {
    // Get AI service URL from environment variables
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:8000';
    
    // Create axios instance with configuration
    this.axiosInstance = axios.create({
      baseURL: this.aiServiceUrl,
      timeout: 10000, // 10 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`AI Service configured at: ${this.aiServiceUrl}`);
  }

  /**
   * Predict wilting risk for a specific soil measurement
   * 
   * @param measurementId - UUID of the soil measurement
   * @returns Prediction result with wilting score and risk level
   */
  async predictWiltingRisk(measurementId: string): Promise<SoilPredictionResult> {
    try {
      // 1. Fetch soil measurement from database
      this.logger.log(`Fetching measurement ${measurementId} from database`);
      const measurement = await this.soilService.findOne(measurementId);

      if (!measurement) {
        throw new HttpException(
          `Soil measurement with ID ${measurementId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      // 2. Prepare data for AI service (convert percentage to ratio)
      const predictionRequest: PredictionRequest = {
        ph: measurement.ph,
        soil_moisture: measurement.soilMoisture / 100, // Convert 0-100% to 0-1 ratio
        temperature: measurement.temperature,
        sunlight: measurement.sunlight,
      };

      this.logger.log(`Sending prediction request to AI service: ${JSON.stringify(predictionRequest)}`);

      // 3. Call AI service via HTTP
      const response = await this.axiosInstance.post<PredictionResponse>(
        '/predict',
        predictionRequest,
      );

      this.logger.log(`Received prediction: ${JSON.stringify(response.data)}`);

      // 4. Return combined result
      return {
        measurementId: measurement.id,
        wilting_score: response.data.wilting_score,
        risk_level: response.data.risk_level,
        measurement_data: {
          ph: measurement.ph,
          soil_moisture: measurement.soilMoisture,
          temperature: measurement.temperature,
          sunlight: measurement.sunlight,
          location: {
            latitude: measurement.latitude,
            longitude: measurement.longitude,
          },
          measured_at: measurement.createdAt,
        },
      };

    } catch (error) {
      // Handle different error types
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // AI service returned an error response
          this.logger.error(`AI service error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
          throw new HttpException(
            `AI service error: ${error.response.data?.detail || 'Prediction failed'}`,
            error.response.status,
          );
        } else if (error.request) {
          // Request was made but no response received
          this.logger.error('AI service not reachable');
          throw new HttpException(
            'AI service is not available. Please ensure the AI service is running.',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
      }

      // Other errors (e.g., database errors)
      this.logger.error(`Prediction error: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to generate prediction',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Batch prediction for multiple soil measurements
   * 
   * @param measurementIds - Array of measurement UUIDs
   * @returns Array of prediction results
   */
  async batchPredictWiltingRisk(measurementIds: string[]): Promise<SoilPredictionResult[]> {
    this.logger.log(`Processing batch prediction for ${measurementIds.length} measurements`);

    const predictions: SoilPredictionResult[] = [];

    // Process predictions sequentially to avoid overwhelming the AI service
    for (const measurementId of measurementIds) {
      try {
        const prediction = await this.predictWiltingRisk(measurementId);
        predictions.push(prediction);
      } catch (error) {
        this.logger.warn(`Failed to predict for measurement ${measurementId}: ${error.message}`);
        // Continue with other measurements even if one fails
      }
    }

    return predictions;
  }

  /**
   * Check if AI service is available
   * 
   * @returns Health status of AI service
   */
  async checkAiServiceHealth(): Promise<{ status: string; service_url: string }> {
    try {
      const response = await this.axiosInstance.get('/health');
      return {
        status: response.data.status || 'healthy',
        service_url: this.aiServiceUrl,
      };
    } catch (error) {
      this.logger.error('AI service health check failed');
      return {
        status: 'unavailable',
        service_url: this.aiServiceUrl,
      };
    }
  }
}
