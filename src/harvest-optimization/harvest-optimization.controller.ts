import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HarvestOptimizationService } from './harvest-optimization.service';

@Controller('parcels')
export class HarvestOptimizationController {
  constructor(
    private readonly harvestOptimizationService: HarvestOptimizationService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get(':parcelId/harvest-optimization')
  async getHarvestOptimization(
    @Param('parcelId') parcelId: string,
    @Request() req,
  ) {
    return this.harvestOptimizationService.getHarvestOptimization(
      parcelId,
      req.user.userId,
    );
  }
}
