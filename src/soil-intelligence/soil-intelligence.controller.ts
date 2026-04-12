import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { SoilIntelligenceService } from './soil-intelligence.service';

@Controller('soil-intelligence')
export class SoilIntelligenceController {
  constructor(private readonly soilIntelligenceService: SoilIntelligenceService) {}

  @Post('fingerprint')
  fingerprint(@Body() body: Record<string, unknown>) {
    return this.soilIntelligenceService.fingerprint(body);
  }

  @Post('weather-alert')
  weatherAlert(@Body() body: Record<string, unknown>) {
    return this.soilIntelligenceService.triggerWeatherAlert(body);
  }

  @Get('alerts/:parcelId')
  getUnreadAlerts(@Param('parcelId') parcelId: string) {
    return this.soilIntelligenceService.getUnreadAlerts(parcelId);
  }

  @Patch('alerts/:alertId/read')
  markAlertAsRead(@Param('alertId') alertId: string) {
    return this.soilIntelligenceService.markAlertAsRead(alertId);
  }
}
