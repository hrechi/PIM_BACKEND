/**
 * ============================================================
 * REVENUES DTO — Validation des données de revenus manuels
 * ============================================================
 *
 * DTOs (Data Transfer Objects) utilisés pour valider les données
 * entrantes via class-validator avant traitement par le service.
 *
 * CreateRevenueDto :
 *   • fieldId     → UUID du champ (obligatoire)
 *   • amount      → Montant numérique positif (obligatoire)
 *   • category    → Catégorie parmi : milk, crops, services, subsidies, other
 *   • date        → Date ISO 8601 (obligatoire)
 *   • description → Description optionnelle (max 200 caractères)
 *
 * UpdateRevenueDto :
 *   → Hérite de CreateRevenueDto avec tous les champs optionnels (PartialType)
 *   → Permet la mise à jour partielle (PATCH)
 * ============================================================
 */
import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsUUID,
  MaxLength,
  IsIn,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

/// Catégories de revenus manuels supportées
export const REVENUE_CATEGORIES = ['milk', 'crops', 'services', 'subsidies', 'other'] as const;
export type RevenueCategory = typeof REVENUE_CATEGORIES[number];

export class CreateRevenueDto {
  @ApiProperty()
  @IsUUID()
  fieldId: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty({ enum: REVENUE_CATEGORIES })
  @IsString()
  @IsIn(REVENUE_CATEGORIES)
  category: RevenueCategory;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

export class UpdateRevenueDto extends PartialType(CreateRevenueDto) {}
