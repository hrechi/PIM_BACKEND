import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RatingsService } from './ratings.service';

@ApiTags('Ratings')
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  /** POST /api/ratings — submit a rating (auth required) */
  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit an app rating' })
  create(
    @Request() req,
    @Body('stars') stars: number,
    @Body('message') message?: string,
  ) {
    return this.ratingsService.create(req.user.id, Number(stars), message);
  }

  /** GET /api/ratings — public, returns latest ratings */
  @Get()
  @ApiOperation({ summary: 'Get latest app ratings (public)' })
  findAll(@Query('limit') limit?: string) {
    return this.ratingsService.findAll(limit ? Number(limit) : 50);
  }

  /** GET /api/ratings/summary — public, returns average + count */
  @Get('summary')
  @ApiOperation({ summary: 'Get rating summary (public)' })
  summary() {
    return this.ratingsService.summary();
  }
}
