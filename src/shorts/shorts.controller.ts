import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ShortsService } from './shorts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShortsResponseDto, ShortsCategoriesDto } from './dto/shorts-response.dto';

@ApiTags('Shorts')
@Controller('shorts')
export class ShortsController {
  constructor(private readonly shortsService: ShortsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get agriculture YouTube Shorts feed',
    description:
      'Returns a paginated list of agriculture-related YouTube Shorts. Results are cached for 15 minutes to conserve API quota.',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description:
      'Filter by category: all, crops, livestock, agritech, organic, harvesting',
    example: 'all',
  })
  @ApiQuery({
    name: 'pageToken',
    required: false,
    description: 'YouTube page token for pagination',
  })
  @ApiResponse({ status: 200, description: 'List of shorts', type: ShortsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'YouTube API quota exceeded' })
  @ApiResponse({ status: 502, description: 'YouTube API error' })
  async getShorts(
    @Query('category') category?: string,
    @Query('pageToken') pageToken?: string,
  ): Promise<ShortsResponseDto> {
    try {
      return await this.shortsService.searchShorts(
        category || 'all',
        pageToken,
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to fetch shorts',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('categories')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get available agriculture categories' })
  @ApiResponse({
    status: 200,
    description: 'List of categories',
    type: ShortsCategoriesDto,
  })
  getCategories(): ShortsCategoriesDto {
    return { categories: this.shortsService.getCategories() };
  }

  @UseGuards(JwtAuthGuard)
  @Get('comments')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get comments for a YouTube Short',
    description: 'Returns top-level comments for a specific video',
  })
  @ApiQuery({ name: 'videoId', required: true, description: 'YouTube video ID' })
  @ApiQuery({ name: 'pageToken', required: false, description: 'Page token for pagination' })
  @ApiResponse({ status: 200, description: 'List of comments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getComments(
    @Query('videoId') videoId: string,
    @Query('pageToken') pageToken?: string,
  ) {
    if (!videoId) {
      throw new HttpException('videoId is required', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.shortsService.getComments(videoId, pageToken);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch comments', HttpStatus.BAD_GATEWAY);
    }
  }
}
