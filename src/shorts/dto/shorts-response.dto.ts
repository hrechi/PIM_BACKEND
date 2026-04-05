import { ApiProperty } from '@nestjs/swagger';

export class ShortVideoDto {
  @ApiProperty({ description: 'YouTube video ID' })
  videoId: string;

  @ApiProperty({ description: 'Video title' })
  title: string;

  @ApiProperty({ description: 'Channel name' })
  channelTitle: string;

  @ApiProperty({ description: 'Channel ID' })
  channelId: string;

  @ApiProperty({ description: 'Thumbnail URL (high quality)' })
  thumbnailUrl: string;

  @ApiProperty({ description: 'Video publish date' })
  publishedAt: string;

  @ApiProperty({ description: 'Total view count' })
  viewCount: string;

  @ApiProperty({ description: 'Total like count' })
  likeCount: string;

  @ApiProperty({ description: 'Total comment count' })
  commentCount: string;

  @ApiProperty({ description: 'Video description' })
  description: string;
}

export class ShortsResponseDto {
  @ApiProperty({ type: [ShortVideoDto], description: 'List of short videos' })
  videos: ShortVideoDto[];

  @ApiProperty({
    description: 'Token for fetching next page',
    required: false,
  })
  nextPageToken?: string;
}

export class ShortsCategoriesDto {
  @ApiProperty({
    type: [String],
    description: 'Available agriculture categories',
  })
  categories: string[];
}
