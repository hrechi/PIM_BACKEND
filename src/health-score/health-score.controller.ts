import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HealthScoreService } from './health-score.service';

@Controller('parcels')
export class HealthScoreController {
  constructor(private readonly healthScoreService: HealthScoreService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':id/health-score')
  async getParcelHealthScore(@Param('id') id: string, @Request() req) {
    // req.user.userId is set by JwtAuthGuard
    return this.healthScoreService.calculateParcelHealthScore(id, req.user.userId);
  }
}
