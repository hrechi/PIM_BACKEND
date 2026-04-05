import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HarvestOptimizationService } from './harvest-optimization.service';

@Controller('parcels')
export class HarvestOptimizationController {
  constructor(private readonly optimizationService: HarvestOptimizationService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':id/harvest-optimization')
  getOptimization(@Param('id') id: string, @Query('cropId') cropId?: string) {
    return this.optimizationService.getOptimization(id, cropId);
  }
}
