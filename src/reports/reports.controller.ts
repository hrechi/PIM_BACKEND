import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a daily AI-generated farm report' })
  @ApiResponse({ status: 201, description: 'Report saved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid report data' })
  async createReport(@Req() req: any, @Body() dto: CreateReportDto) {
    this.logger.log(
      `📥 Incoming daily report from user ${req.user.id} — ` +
        `${dto.totalIncidents} incidents, threat: ${dto.averageThreatLevel}`,
    );
    return this.reportsService.createReport(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get last 7 daily reports for current user' })
  @ApiResponse({ status: 200, description: 'Weekly report history' })
  async getWeeklyHistory(@Req() req: any) {
    return this.reportsService.getWeeklyHistory(req.user.id);
  }
}
