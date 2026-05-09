import { IsEnum, IsBoolean, IsOptional, IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PlanId {
  ESSENTIAL      = 'essential',
  GROWTH         = 'growth',
  OPERATIONS_PRO = 'operations_pro',
  ENTERPRISE     = 'enterprise',
}

export enum RobotTierId {
  CONNECT   = 'robot_connect',
  AUTONOMY  = 'robot_autonomy',
  FLEET     = 'robot_fleet',
}

export class RobotAddonDto {
  @ApiProperty({ enum: RobotTierId })
  @IsEnum(RobotTierId)
  tier: RobotTierId;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateCheckoutDto {
  @ApiProperty({ enum: PlanId })
  @IsEnum(PlanId)
  plan: PlanId;

  @ApiProperty({ description: 'true = annual billing (–18%), false = monthly' })
  @IsBoolean()
  annual: boolean;

  @ApiPropertyOptional({ type: [RobotAddonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RobotAddonDto)
  robots?: RobotAddonDto[];

  @ApiPropertyOptional({ description: 'URL to redirect after successful payment' })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({ description: 'URL to redirect on cancel' })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
