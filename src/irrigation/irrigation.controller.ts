import {
  Controller,
  Post,
  Param,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IrrigationService } from './irrigation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Irrigation')
@Controller('irrigation')
export class IrrigationController {
  constructor(private readonly irrigationService: IrrigationService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':fieldId/schedule')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Generate AI-powered 7-day irrigation schedule for a field' })
  @ApiResponse({ status: 201, description: 'Irrigation schedule generated' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  async generateSchedule(
    @Req() req: any,
    @Param('fieldId') fieldId: string,
  ) {
    try {
      return await this.irrigationService.generateSchedule(
        fieldId,
        req.user.id,
      );
    } catch (error) {
      if (error.status === 404 || error.status === 403) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to generate irrigation schedule',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
