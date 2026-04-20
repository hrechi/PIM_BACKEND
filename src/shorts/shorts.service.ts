import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ShortVideoDto, ShortsResponseDto } from './dto/shorts-response.dto';

interface CacheEntry {
  data: ShortsResponseDto;
  expiry: number;
}

@Injectable()
export class ShortsService {
  private readonly logger = new Logger(ShortsService.name);
  private readonly youtubeApiKey: string;
  private readonly youtubeBaseUrl = 'https://www.googleapis.com/youtube/v3';
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtl = 15 * 60 * 1000; // 15 minutes

  // Agriculture-related search queries per category
  private readonly categoryQueries: Record<string, string> = {
    all: 'farming tips|agriculture tutorial|crop planting|livestock management',
    crops:
      'crop planting guide|seed sowing tips|vegetable farming|fruit growing',
    livestock:
      'livestock management|cattle farming|poultry tips|animal husbandry',
    agritech:
      'agritech innovation|smart farming|precision agriculture|farm technology',
    organic: 'organic farming tips|natural agriculture|composting|permaculture',
    harvesting:
      'harvest techniques|crop harvesting|post harvest|farm harvest tips',
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.youtubeApiKey =
      this.configService.get<string>('YOUTUBE_API_KEY') || '';
    if (!this.youtubeApiKey) {
      this.logger.warn(
        'YOUTUBE_API_KEY is not set in .env — Shorts feature will not work',
      );
    }
  }

  /**
   * Get available agriculture categories
   */
  getCategories(): string[] {
    return Object.keys(this.categoryQueries);
  }

  /**
   * Search for agriculture YouTube Shorts with caching
   */
  async searchShorts(
    category: string = 'all',
    pageToken?: string,
  ): Promise<ShortsResponseDto> {
    if (!this.youtubeApiKey) {
      throw new HttpException(
        'YouTube API key is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Build cache key
    const cacheKey = `${category}_${pageToken || 'first'}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      return cached.data;
    }

    // Resolve query for category
    const query =
      this.categoryQueries[category.toLowerCase()] ||
      this.categoryQueries['all'];

    try {
      // Step 1: Search for short videos
      const searchResponse = await firstValueFrom(
        this.httpService.get(`${this.youtubeBaseUrl}/search`, {
          params: {
            part: 'snippet',
            type: 'video',
            videoDuration: 'short', // filters to Shorts-length videos (< 4 min)
            videoEmbeddable: 'true', // only videos that allow embedding
            videoSyndicated: 'true', // only videos playable outside youtube.com
            q: query,
            relevanceLanguage: 'en',
            maxResults: 10,
            pageToken: pageToken || undefined,
            key: this.youtubeApiKey,
            order: 'relevance',
            safeSearch: 'strict',
          },
          timeout: 15000,
        }),
      );

      const searchData = searchResponse.data;
      const videoIds: string[] = searchData.items.map(
        (item: any) => item.id.videoId,
      );

      if (videoIds.length === 0) {
        return { videos: [], nextPageToken: undefined };
      }

      // Step 2: Get detailed video statistics
      const detailsResponse = await firstValueFrom(
        this.httpService.get(`${this.youtubeBaseUrl}/videos`, {
          params: {
            part: 'snippet,statistics,contentDetails',
            id: videoIds.join(','),
            key: this.youtubeApiKey,
          },
          timeout: 15000,
        }),
      );

      const detailsData = detailsResponse.data;

      // Step 3: Map to DTOs
      const videos: ShortVideoDto[] = detailsData.items.map((item: any) => ({
        videoId: item.id,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        thumbnailUrl:
          item.snippet.thumbnails?.maxres?.url ||
          item.snippet.thumbnails?.high?.url ||
          item.snippet.thumbnails?.medium?.url ||
          '',
        publishedAt: item.snippet.publishedAt,
        viewCount: item.statistics.viewCount || '0',
        likeCount: item.statistics.likeCount || '0',
        commentCount: item.statistics.commentCount || '0',
        description: item.snippet.description || '',
      }));

      const result: ShortsResponseDto = {
        videos,
        nextPageToken: searchData.nextPageToken || undefined,
      };

      // Store in cache
      this.cache.set(cacheKey, {
        data: result,
        expiry: Date.now() + this.cacheTtl,
      });

      // Clean old cache entries periodically
      this.cleanCache();

      return result;
    } catch (error) {
      this.logger.error(`YouTube API error: ${error.message}`);
      if (error.response?.data?.error) {
        const ytError = error.response.data.error;
        this.logger.error(
          `YouTube API details: ${ytError.code} - ${ytError.message}`,
        );

        if (ytError.code === 403) {
          throw new HttpException(
            'YouTube API quota exceeded or API key invalid',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
      throw new HttpException(
        'Failed to fetch YouTube Shorts',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Fetch top-level comments for a specific video
   */
  async getComments(
    videoId: string,
    pageToken?: string,
  ): Promise<{ comments: any[]; nextPageToken?: string }> {
    if (!this.youtubeApiKey) {
      throw new HttpException(
        'YouTube API key is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const cacheKey = `comments_${videoId}_${pageToken || 'first'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data as any;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.youtubeBaseUrl}/commentThreads`, {
          params: {
            part: 'snippet',
            videoId,
            maxResults: 20,
            order: 'relevance',
            textFormat: 'plainText',
            pageToken: pageToken || undefined,
            key: this.youtubeApiKey,
          },
          timeout: 15000,
        }),
      );

      const data = response.data;
      const comments = data.items.map((item: any) => {
        const snippet = item.snippet.topLevelComment.snippet;
        return {
          authorName: snippet.authorDisplayName || 'Anonymous',
          authorProfileUrl: snippet.authorProfileImageUrl || '',
          text: snippet.textDisplay || '',
          likeCount: snippet.likeCount || 0,
          publishedAt: snippet.publishedAt || '',
        };
      });

      const result = {
        comments,
        nextPageToken: data.nextPageToken || undefined,
      };

      this.cache.set(cacheKey, {
        data: result as any,
        expiry: Date.now() + this.cacheTtl,
      });

      return result;
    } catch (error) {
      this.logger.error(`YouTube comments error: ${error.message}`);
      if (error.response?.data?.error?.code === 403) {
        // Comments disabled or quota exceeded
        return { comments: [], nextPageToken: undefined };
      }
      throw new HttpException(
        'Failed to fetch comments',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Remove expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key);
      }
    }
  }
}
