import { Module } from '@nestjs/common';
import { HarvestOptimizationController } from './harvest-optimization.controller';
import { HarvestOptimizationService } from './harvest-optimization.service';

@Module({
  controllers: [HarvestOptimizationController],
  providers: [HarvestOptimizationService]
})
export class HarvestOptimizationModule {}
