import {
  Controller,
  Get,
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
import { WeatherService } from './weather.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Weather')
@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':fieldId')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get 7-day weather forecast for a field' })
  @ApiResponse({ status: 200, description: 'Weather forecast data' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  async getWeather(@Req() req: any, @Param('fieldId') fieldId: string) {
    try {
      return await this.weatherService.getWeatherForField(
        fieldId,
        req.user.id,
      );
    } catch (error) {
      if (
        error.status === 404 ||
        error.status === 403
      ) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to fetch weather',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post(':fieldId/recommendations')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get AI agricultural recommendations for a field',
  })
  @ApiResponse({
    status: 200,
    description: 'Weather forecast + AI recommendations',
  })
  @ApiResponse({ status: 404, description: 'Field not found' })
  async getRecommendations(
    @Req() req: any,
    @Param('fieldId') fieldId: string,
  ) {
    try {
      return await this.weatherService.getRecommendations(
        fieldId,
        req.user.id,
      );
    } catch (error) {
      if (
        error.status === 404 ||
        error.status === 403
      ) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to generate recommendations',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
