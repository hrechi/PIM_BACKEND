import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SoilService } from '../soil/soil.service';
import { SoilAiService } from '../soil/soil-ai.service';
import {
	AnalyzeExistingCropsResponseDto,
	CropAnalysisItemDto,
	CropDecision,
	RecommendCropsResponseDto,
	RecommendedCropDto,
	SoilProfileDto,
	PhStatus,
	NutrientStatus,
} from './dto/analyze-crop.dto';

interface ParcelWithRelations {
	id: string;
	location: string;
	soilPh: number | null;
	nitrogenLevel: number | null;
	phosphorusLevel: number | null;
	potassiumLevel: number | null;
	farmerId: string;
	crops: {
		id: string;
		cropName: string;
		variety: string;
		plantingDate: Date;
		expectedHarvestDate: Date;
	}[];
}

interface CropRequirementConfig {
	id: string;
	cropName: string;
	minPH: number;
	maxPH: number;
	minMoisture: number;
	maxMoisture: number;
	nitrogenRequired: number;
}

interface CropRegionConfig {
	id: string;
	cropName: string;
	country: string;
}

// Old interfaces for deprecated rule-based methods
/*
interface SoilProfile {
	fertilityIndex: number;
	overallSuitability: OverallSuitability;
	phStatus: PhStatus;
	moistureStatus: MoistureStatus;
	nitrogenStatus: NitrogenStatus;
	ph: number;
	moisture: number;
	nitrogen: number | null;
}

interface CropCompatibility {
	phCompatibility: number;
	moistureCompatibility: number;
	nitrogenCompatibility: number;
	overall: number;
}
*/


@Injectable()
export class CropSuitabilityService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly soilService: SoilService,
		private readonly soilAiService: SoilAiService,
	) {}

	// ========================================================================
	// OLD RULE-BASED METHODS (DEPRECATED - Replaced by ML in analyzeExistingCrops and recommendCrops)
	// Kept for reference only
	// ========================================================================
	
	/*
	private async computeSoilProfile(): Promise<SoilProfile> {
		const latestMeasurement = await this.soilService.findLatest();
		const prediction = await this.soilAiService.predictWiltingRisk(
			latestMeasurement.id,
		);

		// fertilityIndex = (100 - wilting_score) / 100
		const fertilityIndex = Math.max(
			0,
			Math.min(1, (100 - prediction.wilting_score) / 100),
		);

		// Determine overall suitability
		let overallSuitability: OverallSuitability;
		if (fertilityIndex >= 0.75) {
			overallSuitability = 'SUITABLE';
		} else if (fertilityIndex >= 0.5) {
			overallSuitability = 'LIMITED';
		} else {
			overallSuitability = 'POOR';
		}

		// Determine pH status
		let phStatus: PhStatus;
		if (latestMeasurement.ph < 6.0) {
			phStatus = 'ACIDIC';
		} else if (latestMeasurement.ph <= 7.5) {
			phStatus = 'NEUTRAL';
		} else {
			phStatus = 'ALKALINE';
		}

		// Determine moisture status
		let moistureStatus: MoistureStatus;
		if (latestMeasurement.soilMoisture < 20) {
			moistureStatus = 'LOW';
		} else if (latestMeasurement.soilMoisture <= 60) {
			moistureStatus = 'OPTIMAL';
		} else {
			moistureStatus = 'HIGH';
		}

		// Determine nitrogen status (we'll get this from parcel, but for now use a placeholder)
		// This will be overridden when we have parcel-specific nitrogen data
		const nitrogenStatus: NitrogenStatus = 'ADEQUATE';

		return {
			fertilityIndex,
			overallSuitability,
			phStatus,
			moistureStatus,
			nitrogenStatus,
			ph: latestMeasurement.ph,
			moisture: latestMeasurement.soilMoisture,
			nitrogen: null,
		};
	}

	private calculateCropCompatibility(
		soilProfile: SoilProfile,
		requirement: CropRequirementConfig,
	): CropCompatibility {
		// pH Compatibility
		let phCompatibility = 0;
		if (
			soilProfile.ph >= requirement.minPH &&
			soilProfile.ph <= requirement.maxPH
		) {
			phCompatibility = 1.0;
		} else {
			const phDelta = Math.min(
				Math.abs(soilProfile.ph - requirement.minPH),
				Math.abs(soilProfile.ph - requirement.maxPH),
			);
			if (phDelta <= 0.5) {
				phCompatibility = 0.5;
			} else {
				phCompatibility = 0;
			}
		}

		// Moisture Compatibility
		let moistureCompatibility = 0;
		if (
			soilProfile.moisture >= requirement.minMoisture &&
			soilProfile.moisture <= requirement.maxMoisture
		) {
			moistureCompatibility = 1.0;
		} else {
			const moistureDelta = Math.min(
				Math.abs(soilProfile.moisture - requirement.minMoisture),
				Math.abs(soilProfile.moisture - requirement.maxMoisture),
			);
			if (moistureDelta <= 10) {
				moistureCompatibility = 0.5;
			} else {
				moistureCompatibility = 0;
			}
		}

		// Nitrogen Compatibility
		let nitrogenCompatibility = 1.0; // Default to compatible if no data
		if (soilProfile.nitrogen !== null) {
			if (soilProfile.nitrogen >= requirement.nitrogenRequired) {
				nitrogenCompatibility = 1.0;
			} else {
				const nitrogenDeficit = requirement.nitrogenRequired - soilProfile.nitrogen;
				if (nitrogenDeficit <= 10) {
					nitrogenCompatibility = 0.5;
				} else {
					nitrogenCompatibility = 0;
				}
			}
		}

		// Overall crop compatibility
		const overall =
			phCompatibility * 0.4 +
			moistureCompatibility * 0.3 +
			nitrogenCompatibility * 0.3;

		return {
			phCompatibility,
			moistureCompatibility,
			nitrogenCompatibility,
			overall,
		};
	}

	private generateRecommendations(
		compatibility: CropCompatibility,
		soilProfile: SoilProfile,
		requirement: CropRequirementConfig,
	): string[] {
		const recommendations: string[] = [];

		if (compatibility.phCompatibility < 1) {
			if (soilProfile.ph < requirement.minPH) {
				recommendations.push(
					`Soil pH (${soilProfile.ph.toFixed(1)}) is below optimal range (${requirement.minPH}-${requirement.maxPH}). Consider applying lime to raise pH.`,
				);
			} else {
				recommendations.push(
					`Soil pH (${soilProfile.ph.toFixed(1)}) is above optimal range (${requirement.minPH}-${requirement.maxPH}). Consider applying sulfur to lower pH.`,
				);
			}
		}

		if (compatibility.moistureCompatibility < 1) {
			if (soilProfile.moisture < requirement.minMoisture) {
				recommendations.push(
					`Soil moisture (${soilProfile.moisture.toFixed(1)}%) is below optimal range (${requirement.minMoisture}-${requirement.maxMoisture}%). Increase irrigation frequency.`,
				);
			} else {
				recommendations.push(
					`Soil moisture (${soilProfile.moisture.toFixed(1)}%) is above optimal range (${requirement.minMoisture}-${requirement.maxMoisture}%). Improve drainage or reduce irrigation.`,
				);
			}
		}

		if (compatibility.nitrogenCompatibility < 1 && soilProfile.nitrogen !== null) {
			recommendations.push(
				`Nitrogen level (${soilProfile.nitrogen} mg/kg) is below requirement (${requirement.nitrogenRequired} mg/kg). Apply nitrogen-rich fertilizer.`,
			);
		}

		return recommendations;
	}

	private determineCropDecision(
		suitabilityScore: number,
		soilProfile: SoilProfile,
	): CropDecision {
		// If soil overall suitability is POOR, cannot plant anything
		if (soilProfile.overallSuitability === 'POOR') {
			return 'CANNOT_PLANT';
		}

		// Decision based on suitability score
		if (suitabilityScore >= 70) {
			return 'CAN_PLANT';
		} else if (suitabilityScore >= 40) {
			return 'CAN_PLANT_WITH_IMPROVEMENT';
		} else {
			return 'CANNOT_PLANT';
		}
	}
	*/

	// ========================================================================
	// END OF DEPRECATED METHODS
	// ========================================================================

	/**
	 * Normalize crop names to match the standard naming in crop_requirements table.
	 * Handles variations like "cucumber" → "Cucumbers", "Olive" → "Olive Trees"
	 */
	private normalizeCropName(cropName: string): string {
		const normalized = cropName.trim();
		
		// Mapping for common variations
		const mappings: Record<string, string> = {
			'cucumber': 'Cucumbers',
			'cucumbers': 'Cucumbers',
			'tomato': 'Tomatoes',
			'tomatoes': 'Tomatoes',
			'potato': 'Potatoes',
			'potatoes': 'Potatoes',
			'carrot': 'Carrots',
			'carrots': 'Carrots',
			'pepper': 'Peppers',
			'peppers': 'Peppers',
			'strawberry': 'Strawberries',
			'strawberries': 'Strawberries',
			'blueberry': 'Blueberries',
			'blueberries': 'Blueberries',
			'olive': 'Olive Trees',
			'olives': 'Olive Trees',
			'olive tree': 'Olive Trees',
			'olive trees': 'Olive Trees',
			'bean': 'Beans',
			'beans': 'Beans',
			'garlic': 'Garlic',
			'onion': 'Onions',
			'onions': 'Onions',
			'lettuce': 'Lettuce',
			'spinach': 'Spinach',
			'basil': 'Basil',
		};

		// Check case-insensitive mapping
		const lowerName = normalized.toLowerCase();
		if (mappings[lowerName]) {
			return mappings[lowerName];
		}

		// If no mapping found, try to match case-insensitively against existing requirements
		// Return the input as-is (the query will still try to match it)
		return normalized;
	}

	/**
	 * Analyze existing crops using unified ML-based AI service
	 */
	async analyzeExistingCrops(
		parcelId: string,
		farmerId: string,
		measurementData?: {
			N?: number;
			P?: number;
			K?: number;
			ph?: number;
			temperature?: number;
			humidity?: number;
			rainfall?: number;
		},
	): Promise<AnalyzeExistingCropsResponseDto> {
		const parcel = (await this.prisma.parcel.findFirst({
			where: { id: parcelId, farmerId },
			include: { crops: true },
		})) as ParcelWithRelations | null;

		if (!parcel) {
			throw new NotFoundException('Parcel not found or you do not have access');
		}

		// Use provided measurement data if available, otherwise fall back to parcel defaults
		// Priority: measurementData > parcel values > defaults
		const N = measurementData?.N ?? parcel.nitrogenLevel ?? 40;
		const P = measurementData?.P ?? parcel.phosphorusLevel ?? 30;
		const K = measurementData?.K ?? parcel.potassiumLevel ?? 30;
		const ph = measurementData?.ph ?? parcel.soilPh ?? 6.5;
		const temperature = measurementData?.temperature ?? 25 + Math.random() * 5;
		const humidity = measurementData?.humidity ?? 60 + Math.random() * 20;
		const rainfall = measurementData?.rainfall ?? 100 + Math.random() * 100;

		// Prepare farmer's crops list
		const farmerCrops = parcel.crops.map(c => c.cropName.toLowerCase());

		// Get region from parcel location
		const region = parcel.location || 'Lebanon';

		// Call ML-based crop suitability API with parcel-specific data
		const aiResponse = await this.soilAiService.predictCropSuitability({
			N,
			P,
			K,
			temperature,
			humidity,
			ph,
			rainfall,
			region,
			farmerCrops,
		});

		// Map AI response to DTO format
		const soilProfileDto: SoilProfileDto = {
			soilHealthScore: Math.round(aiResponse.soilProfile.soilHealthScore * 100) / 100,
			fertilityIndex: Math.round(aiResponse.soilProfile.fertilityIndex * 100) / 100,
			phStatus: aiResponse.soilProfile.phStatus as PhStatus,
			nutrientStatus: aiResponse.soilProfile.nutrientStatus as NutrientStatus,
		};

		const cropsAnalysis: CropAnalysisItemDto[] = aiResponse.farmerCropsAnalysis.map(analysis => ({
			crop: analysis.crop,
			probability: Math.round(analysis.probability * 100) / 100,
			decision: analysis.decision as CropDecision,
			recommendations: [], // Individual crop recommendations can be added here if needed
		}));

		return {
			soilProfile: soilProfileDto,
			cropsAnalysis,
			recommendations: aiResponse.recommendations,
		};
	}

	async recommendCrops(
		parcelId: string,
		farmerId: string,
		measurementData?: {
			N?: number;
			P?: number;
			K?: number;
			ph?: number;
			temperature?: number;
			humidity?: number;
			rainfall?: number;
		},
	): Promise<RecommendCropsResponseDto> {
		const parcel = await this.prisma.parcel.findFirst({
			where: { id: parcelId, farmerId },
		});

		if (!parcel) {
			throw new NotFoundException('Parcel not found or you do not have access');
		}

		// Use measurement data if provided, otherwise use parcel values, otherwise use defaults
		const N = measurementData?.N ?? parcel.nitrogenLevel ?? 40;
		const P = measurementData?.P ?? parcel.phosphorusLevel ?? 30;
		const K = measurementData?.K ?? parcel.potassiumLevel ?? 30;
		const ph = measurementData?.ph ?? parcel.soilPh ?? 6.5;
		const temperature = measurementData?.temperature ?? 25.0;
		const humidity = measurementData?.humidity ?? 65.0;
		const rainfall = measurementData?.rainfall ?? 100.0;
		const region = parcel.location;

		// Call ML API to get crop recommendations (without farmerCrops)
		const mlResult = await this.soilAiService.predictCropSuitability({
			N,
			P,
			K,
			temperature,
			humidity,
			ph,
			rainfall,
			region,
			// Don't pass farmerCrops to get general recommendations
		});

		// Map soil profile
		const soilProfileDto: SoilProfileDto = {
			soilHealthScore: mlResult.soilProfile.soilHealthScore,
			fertilityIndex: mlResult.soilProfile.fertilityIndex,
			phStatus: mlResult.soilProfile.phStatus as PhStatus,
			nutrientStatus: mlResult.soilProfile.nutrientStatus as NutrientStatus,
		};

		// Map recommended crops from ML best crops
		const recommendedCrops: RecommendedCropDto[] = mlResult.bestCrops.map(
			(crop) => ({
				crop: crop.crop,
				probability: crop.probability,
				decision: 'CAN_PLANT', // Top ML recommendations are plantable
			}),
		);

		return {
			soilProfile: soilProfileDto,
			recommendedCrops,
			recommendations: mlResult.recommendations,
		};
	}
}
