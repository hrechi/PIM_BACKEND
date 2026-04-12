import { Module } from '@nestjs/common';
import { HarvestOptimizationController } from './harvest-optimization.controller';
import { HarvestOptimizationService } from './harvest-optimization.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HarvestOptimizationController],
  providers: [HarvestOptimizationService],
})
export class HarvestOptimizationModule {}
