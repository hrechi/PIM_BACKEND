import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /analytics/yield/summary
   * Farm-wide KPIs: total yield, avg yield/ha, best performing parcel,
   * recent 12-month trend.
   */
  @Get('yield/summary')
  async getYieldSummary(@Req() req) {
    const data = await this.analyticsService.getYieldSummary(req.user.id);
    return { data };
  }

  /**
   * GET /analytics/yield/parcel/:parcelId
   * Monthly yield trend for one specific parcel.
   */
  @Get('yield/parcel/:parcelId')
  async getYieldByParcel(
    @Req() req,
    @Param('parcelId') parcelId: string,
  ) {
    const data = await this.analyticsService.getYieldByParcel(
      parcelId,
      req.user.id,
    );
    return { data };
  }

  /**
   * GET /analytics/yield/crop/:cropName
   * Total yield comparison across all parcels that grew a given crop.
   */
  @Get('yield/crop/:cropName')
  async getYieldByCrop(
    @Req() req,
    @Param('cropName') cropName: string,
  ) {
    const data = await this.analyticsService.getYieldByCrop(
      cropName,
      req.user.id,
    );
    return { data };
  }
}
