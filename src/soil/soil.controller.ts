import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FileValidator } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { SoilService } from './soil.service';
import { SoilAiService } from './soil-ai.service';
import { CreateSoilDto } from './dto/create-soil.dto';
import { UpdateSoilDto } from './dto/update-soil.dto';
import { QuerySoilDto } from './dto/query-soil.dto';
import { BatchPredictionDto } from './dto/batch-prediction.dto';

// Custom file extension validator for soil images
class ImageFileValidator extends FileValidator {
  private allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  isValid(file: Express.Multer.File): boolean {
    const ext = extname(file.originalname).toLowerCase();
    return this.allowedExtensions.includes(ext);
  }

  buildErrorMessage(): string {
    return 'Only image files (jpg, jpeg, png, webp) are allowed';
  }
}

@ApiTags('Soil Measurements')
@Controller('soil')
export class SoilController {
  constructor(
    private readonly soilService: SoilService,
    private readonly soilAiService: SoilAiService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new soil measurement',
    description:
      'Creates a new soil measurement record with all required parameters including pH, moisture, nutrients, and location data.',
  })
  @ApiResponse({
    status: 201,
    description: 'Soil measurement successfully created',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        ph: 6.5,
        soilMoisture: 45.5,
        sunlight: 850.5,
        nutrients: { nitrogen: 20, phosphorus: 15, potassium: 25 },
        temperature: 22.5,
        latitude: 40.7128,
        longitude: -74.006,
        createdAt: '2026-02-14T12:00:00.000Z',
        updatedAt: '2026-02-14T12:00:00.000Z',
        phStatus: 'Neutral',
        moistureStatus: 'Optimal',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input - validation failed',
  })
  create(@Body() createSoilDto: CreateSoilDto) {
    return this.soilService.create(createSoilDto);
  }

  @Post('with-image')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create soil measurement with photo',
    description:
      'Upload soil photo for type detection and create measurement. The AI service will analyze the image to detect soil type, confidence, and suggest pH/moisture values.',
  })
  @ApiResponse({
    status: 201,
    description: 'Soil measurement created with AI-detected soil type',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        ph: 6.5,
        soilMoisture: 55.0,
        sunlight: 850.5,
        nutrients: { nitrogen: 50, phosphorus: 40, potassium: 45 },
        temperature: 22.5,
        latitude: 40.7128,
        longitude: -74.006,
        imagePath: 'uploads/soil/soil-1234567890-xyz.jpg',
        soilType: 'Loam',
        detectionConfidence: 0.85,
        createdAt: '2026-03-01T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or validation failed',
  })
  @ApiResponse({
    status: 503,
    description: 'AI service unavailable',
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/soil',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `soil-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async createWithImage(
    @Body() body: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10 MB
          new ImageFileValidator({}),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    // Parse multipart form data to correct types
    // (multipart/form-data sends everything as strings)
    const createSoilDto: CreateSoilDto = {
      ph: parseFloat(body.ph),
      soilMoisture: parseFloat(body.soilMoisture),
      sunlight: parseFloat(body.sunlight),
      nutrients: typeof body.nutrients === 'string' 
        ? JSON.parse(body.nutrients) 
        : body.nutrients,
      temperature: parseFloat(body.temperature),
      latitude: parseFloat(body.latitude),
      longitude: parseFloat(body.longitude),
      fieldId: body.fieldId || undefined,
      parcelId: body.parcelId || undefined,
    };

    const imagePath = `uploads/soil/${file.filename}`;

    // Call service method to handle AI classification and creation
    return this.soilService.createWithImage(createSoilDto, imagePath, file.path);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all soil measurements',
    description:
      'Retrieves all soil measurements with support for pagination, filtering, and sorting.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of soil measurements with pagination metadata',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            ph: 6.5,
            soilMoisture: 45.5,
            sunlight: 850.5,
            nutrients: { nitrogen: 20, phosphorus: 15, potassium: 25 },
            temperature: 22.5,
            latitude: 40.7128,
            longitude: -74.006,
            createdAt: '2026-02-14T12:00:00.000Z',
            updatedAt: '2026-02-14T12:00:00.000Z',
            phStatus: 'Neutral',
            moistureStatus: 'Optimal',
          },
        ],
        meta: {
          total: 100,
          page: 1,
          limit: 10,
          totalPages: 10,
        },
      },
    },
  })
  findAll(@Query() query: QuerySoilDto) {
    return this.soilService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a single soil measurement',
    description: 'Retrieves a specific soil measurement by its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Soil measurement UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Soil measurement found',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        ph: 6.5,
        soilMoisture: 45.5,
        sunlight: 850.5,
        nutrients: { nitrogen: 20, phosphorus: 15, potassium: 25 },
        temperature: 22.5,
        latitude: 40.7128,
        longitude: -74.006,
        createdAt: '2026-02-14T12:00:00.000Z',
        updatedAt: '2026-02-14T12:00:00.000Z',
        phStatus: 'Neutral',
        moistureStatus: 'Optimal',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid UUID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Soil measurement not found',
  })
  findOne(@Param('id') id: string) {
    return this.soilService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a soil measurement',
    description:
      'Updates an existing soil measurement. All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    description: 'Soil measurement UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Soil measurement successfully updated',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        ph: 7.0,
        soilMoisture: 50.0,
        sunlight: 850.5,
        nutrients: { nitrogen: 20, phosphorus: 15, potassium: 25 },
        temperature: 22.5,
        latitude: 40.7128,
        longitude: -74.006,
        createdAt: '2026-02-14T12:00:00.000Z',
        updatedAt: '2026-02-14T13:00:00.000Z',
        phStatus: 'Neutral',
        moistureStatus: 'Optimal',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid UUID format or validation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Soil measurement not found',
  })
  update(@Param('id') id: string, @Body() updateSoilDto: UpdateSoilDto) {
    return this.soilService.update(id, updateSoilDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a soil measurement',
    description: 'Permanently deletes a soil measurement by its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Soil measurement UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 204,
    description: 'Soil measurement successfully deleted',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid UUID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Soil measurement not found',
  })
  remove(@Param('id') id: string) {
    return this.soilService.remove(id);
  }

  // ==================== AI PREDICTION ENDPOINTS ====================

  @Get(':id/predict')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🤖 Predict wilting risk using AI',
    description:
      'Fetches soil measurement data and sends it to the AI microservice for wilting risk prediction. ' +
      'Returns a score (0-100) and risk level (Low/Medium/High).',
  })
  @ApiParam({
    name: 'id',
    description: 'Soil measurement UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Prediction generated successfully',
    schema: {
      example: {
        measurementId: '550e8400-e29b-41d4-a716-446655440000',
        wilting_score: 35.8,
        risk_level: 'Low',
        measurement_data: {
          ph: 6.5,
          soil_moisture: 0.35,
          temperature: 25.0,
          sunlight: 450.0,
          location: {
            latitude: 40.7128,
            longitude: -74.006,
          },
          measured_at: '2026-02-14T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Soil measurement not found',
  })
  @ApiResponse({
    status: 503,
    description: 'AI service unavailable',
  })
  predictWiltingRisk(@Param('id') id: string) {
    return this.soilAiService.predictWiltingRisk(id);
  }

  @Post('predict/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🤖 Batch predict wilting risk for multiple measurements',
    description:
      'Sends multiple soil measurements to AI service for batch prediction. ' +
      'Useful for analyzing multiple fields or historical data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch predictions generated',
    schema: {
      example: [
        {
          measurementId: '550e8400-e29b-41d4-a716-446655440000',
          wilting_score: 35.8,
          risk_level: 'Low',
          measurement_data: {
            ph: 6.5,
            soil_moisture: 0.35,
            temperature: 25.0,
            sunlight: 450.0,
            location: { latitude: 40.7128, longitude: -74.006 },
            measured_at: '2026-02-14T12:00:00.000Z',
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 503,
    description: 'AI service unavailable',
  })
  batchPredictWiltingRisk(@Body() batchDto: BatchPredictionDto) {
    return this.soilAiService.batchPredictWiltingRisk(batchDto.measurementIds);
  }

  @Get('ai/health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🏥 Check AI service health',
    description: 'Checks if the AI microservice is available and ready to process predictions.',
  })
  @ApiResponse({
    status: 200,
    description: 'AI service status',
    schema: {
      example: {
        status: 'healthy',
        service_url: 'http://192.168.1.17:8000',
      },
    },
  })
  checkAiHealth() {
    return this.soilAiService.checkAiServiceHealth();
  }

  @Post('crop-compatibility')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check parcel crop compatibility with current soil data',
    description: 'Proxies crop compatibility checks to AI service using farmer-entered soil parameters.',
  })
  checkCropCompatibility(@Body() payload: Record<string, any>) {
    return this.soilAiService.checkCropCompatibility(payload);
  }

  @Post('fix-for-crops')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get soil correction actions for failed crops',
    description: 'Returns prioritized actions to improve soil conditions for crops that cannot be planted.',
  })
  getSoilCorrections(@Body() payload: Record<string, any>) {
    return this.soilAiService.getSoilCorrections(payload);
  }

  @Post('seasonal-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get season-aware soil plan and crop advice',
    description: 'Returns tasks, warnings, and season crop advice based on current soil metrics.',
  })
  getSeasonalPlan(@Body() payload: Record<string, any>) {
    return this.soilAiService.getSeasonalPlan(payload);
  }
}
