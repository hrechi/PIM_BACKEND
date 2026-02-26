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

@Injectable()
export class CropSuitabilityService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly soilService: SoilService,
		private readonly soilAiService: SoilAiService,
	) {}

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

	async analyzeExistingCrops(
		parcelId: string,
		farmerId: string,
	): Promise<AnalyzeExistingCropsResponseDto> {
		const parcel = (await this.prisma.parcel.findFirst({
			where: { id: parcelId, farmerId },
			include: { crops: true },
		})) as ParcelWithRelations | null;

		if (!parcel) {
			throw new NotFoundException('Parcel not found or you do not have access');
		}

		const latestMeasurement = await this.soilService.findLatest();
		const prediction = await this.soilAiService.predictWiltingRisk(
			latestMeasurement.id,
		);

		const soilHealthScore = Math.max(
			0,
			Math.min(100, 100 - prediction.wilting_score),
		);
		const wiltingRisk =
			prediction.risk_level === 'Medium'
				? 'Moderate'
				: prediction.risk_level;

		const cropsAnalysis: CropAnalysisItemDto[] = [];

		const prismaAny = this.prisma as any;

		for (const crop of parcel.crops) {
			const normalizedCropName = this.normalizeCropName(crop.cropName);
			
			const requirement = (await prismaAny.cropRequirement.findFirst({
				where: { cropName: normalizedCropName },
			})) as CropRequirementConfig | null;

			const region = (await prismaAny.cropRegion.findFirst({
				where: {
					cropName: normalizedCropName,
					country: parcel.location,
				},
			})) as CropRegionConfig | null;

			let score = 100;
			const recommendations: string[] = [];

			const regionAllowed = !!region;

			if (!requirement) {
				score = 0;
				recommendations.push(
					'No agronomic requirements configured for this crop',
				);
			} else {
				if (latestMeasurement.ph < requirement.minPH) {
					score -= 30;
					recommendations.push(
						'Soil pH is below the optimal range for this crop',
					);
				} else if (latestMeasurement.ph > requirement.maxPH) {
					score -= 30;
					recommendations.push(
						'Soil pH is above the optimal range for this crop',
					);
				}

				if (latestMeasurement.soilMoisture < requirement.minMoisture) {
					score -= 25;
					recommendations.push(
						'Soil moisture is below the optimal range. Consider improving irrigation.',
					);
				} else if (latestMeasurement.soilMoisture > requirement.maxMoisture) {
					score -= 25;
					recommendations.push(
						'Soil moisture is above the optimal range. Improve drainage where possible.',
					);
				}

				if (
					parcel.nitrogenLevel != null &&
					parcel.nitrogenLevel < requirement.nitrogenRequired
				) {
					score -= 20;
					recommendations.push(
						'Nitrogen level is below requirement. Consider fertilization.',
					);
				}
			}

			if (!regionAllowed) {
				score = Math.min(score, 40);
				recommendations.push(
					'Crop is not configured as allowed for this country.',
				);
			}

			if (score < 0) {
				score = 0;
			}

			const decision: CropDecision =
				score >= 70
					? 'CAN_PLANT'
					: score >= 50
					? 'CAN_PLANT_WITH_IMPROVEMENT'
					: 'CANNOT_PLANT';

			cropsAnalysis.push({
				crop: crop.cropName,
				regionAllowed,
				suitabilityScore: score,
				decision,
				recommendations,
			});
		}

		return {
			soilHealthScore,
			wiltingRisk,
			cropsAnalysis,
		};
	}

	async recommendCrops(
		parcelId: string,
		farmerId: string,
	): Promise<RecommendCropsResponseDto> {
		const parcel = await this.prisma.parcel.findFirst({
			where: { id: parcelId, farmerId },
		});

		if (!parcel) {
			throw new NotFoundException('Parcel not found or you do not have access');
		}

		const latestMeasurement = await this.soilService.findLatest();
		const prediction = await this.soilAiService.predictWiltingRisk(
			latestMeasurement.id,
		);

		const soilHealthScore = Math.max(
			0,
			Math.min(100, 100 - prediction.wilting_score),
		);
		const wiltingRisk =
			prediction.risk_level === 'Medium'
				? 'Moderate'
				: prediction.risk_level;

		const prismaAny = this.prisma as any;

		const regions = (await prismaAny.cropRegion.findMany({
			where: { country: parcel.location },
		})) as CropRegionConfig[];

		if (regions.length === 0) {
			return {
				soilHealthScore,
				wiltingRisk,
				recommendedCrops: [],
			};
		}

		const cropNames: string[] = Array.from(
			new Set(regions.map((r) => r.cropName)),
		);

		const requirements = (await prismaAny.cropRequirement.findMany({
			where: { cropName: { in: cropNames } },
		})) as CropRequirementConfig[];

		const requirementByCrop = new Map<string, CropRequirementConfig>(
			requirements.map((req) => [req.cropName, req]),
		);

		const recommended: RecommendedCropDto[] = [];

		for (const cropName of cropNames) {
			const requirement = requirementByCrop.get(cropName);
			if (!requirement) {
				continue;
			}

			let score = 100;
			const recommendations: string[] = [];

			if (latestMeasurement.ph < requirement.minPH) {
				score -= 30;
				recommendations.push(
					'Soil pH is below the optimal range for this crop',
				);
			} else if (latestMeasurement.ph > requirement.maxPH) {
				score -= 30;
				recommendations.push(
					'Soil pH is above the optimal range for this crop',
				);
			}

			if (latestMeasurement.soilMoisture < requirement.minMoisture) {
				score -= 25;
				recommendations.push(
					'Soil moisture is below the optimal range. Consider improving irrigation.',
				);
			} else if (latestMeasurement.soilMoisture > requirement.maxMoisture) {
				score -= 25;
				recommendations.push(
					'Soil moisture is above the optimal range. Improve drainage where possible.',
				);
			}

			if (
				parcel.nitrogenLevel != null &&
				parcel.nitrogenLevel < requirement.nitrogenRequired
			) {
				score -= 20;
				recommendations.push(
					'Nitrogen level is below requirement. Consider fertilization.',
				);
			}

			if (score < 0) {
				score = 0;
			}

			const decision: CropDecision =
				score >= 70
					? 'CAN_PLANT'
					: score >= 50
					? 'CAN_PLANT_WITH_IMPROVEMENT'
					: 'CANNOT_PLANT';

			recommended.push({
				crop: cropName,
				suitabilityScore: score,
				decision,
				recommendations,
			});
		}

		recommended.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

		return {
			soilHealthScore,
			wiltingRisk,
			recommendedCrops: recommended.slice(0, 5),
		};
	}
}
