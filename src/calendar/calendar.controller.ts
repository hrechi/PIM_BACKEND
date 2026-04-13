import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CalendarService } from './calendar.service';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('parcel/:parcelId')
  async getParcelCalendar(@Param('parcelId') parcelId: string, @Request() req) {
    // req.user.userId is populated by JwtAuthGuard
    return this.calendarService.getParcelCalendar(parcelId, req.user.userId);
  }

  @Get('all')
  async getAllCalendar(@Request() req) {
    return this.calendarService.getAllCalendar(req.user.userId);
  }
}
