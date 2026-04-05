import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommunityService } from './community.service';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsDto } from './dto/list-posts.dto';
import { ReactDto } from './dto/react.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { VoteDto } from './dto/vote.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.jfif'];
const MAX_FILE_SIZE = 15 * 1024 * 1024;

@ApiTags('Community')
@ApiBearerAuth('access-token')
@Controller('community')
@UseGuards(JwtAuthGuard)
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Post('posts')
  @ApiOperation({ summary: 'Create a community post (standard or vote)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        pollQuestion: { type: 'string' },
        pollOptions: {
          oneOf: [
            { type: 'array', items: { type: 'string' } },
            { type: 'string', description: 'JSON array string or comma-separated values' },
          ],
        },
        pollEndsAt: { type: 'string', format: 'date-time' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/community',
        filename: (req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `community-${unique}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async createPost(
    @Req() req: any,
    @Body() body: Record<string, unknown>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException('Image file exceeds maximum size of 15MB');
      }

      const extension = extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        throw new BadRequestException(`Invalid image type: ${extension}`);
      }
    }

    const dto = this.parseCreatePostDto(body);
    const imagePath = file ? `/uploads/community/${file.filename}` : undefined;

    return this.communityService.createPost(req.user.id, dto, imagePath);
  }

  @Get('posts')
  @ApiOperation({ summary: 'Get global community feed posts' })
  listPosts(@Req() req: any, @Query() query: ListPostsDto) {
    return this.communityService.listPosts(req.user.id, query.limit, query.offset);
  }

  @Patch('posts/:postId')
  @ApiOperation({ summary: 'Update own post content' })
  updatePost(@Req() req: any, @Param('postId') postId: string, @Body() dto: UpdatePostDto) {
    return this.communityService.updatePost(req.user.id, postId, dto);
  }

  @Delete('posts/:postId')
  @ApiOperation({ summary: 'Delete own post' })
  deletePost(@Req() req: any, @Param('postId') postId: string) {
    return this.communityService.deletePost(req.user.id, postId);
  }

  @Post('posts/:postId/react')
  @ApiOperation({ summary: 'Like or dislike a post (toggle behavior)' })
  reactPost(@Req() req: any, @Param('postId') postId: string, @Body() dto: ReactDto) {
    return this.communityService.reactToPost(req.user.id, postId, dto.type);
  }

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: 'List post comments (with replies)' })
  listComments(@Req() req: any, @Param('postId') postId: string) {
    return this.communityService.listComments(req.user.id, postId);
  }

  @Post('posts/:postId/comments')
  @ApiOperation({ summary: 'Add comment or reply to a post' })
  createComment(
    @Req() req: any,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.communityService.createComment(req.user.id, postId, dto);
  }

  @Patch('comments/:commentId')
  @ApiOperation({ summary: 'Update own comment or reply' })
  updateComment(
    @Req() req: any,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.communityService.updateComment(req.user.id, commentId, dto);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete own comment or reply' })
  deleteComment(@Req() req: any, @Param('commentId') commentId: string) {
    return this.communityService.deleteComment(req.user.id, commentId);
  }

  @Post('comments/:commentId/react')
  @ApiOperation({ summary: 'Like or dislike a comment/reply (toggle behavior)' })
  reactComment(
    @Req() req: any,
    @Param('commentId') commentId: string,
    @Body() dto: ReactDto,
  ) {
    return this.communityService.reactToComment(req.user.id, commentId, dto.type);
  }

  @Post('posts/:postId/vote')
  @ApiOperation({ summary: 'Vote on a community poll post' })
  vote(@Req() req: any, @Param('postId') postId: string, @Body() dto: VoteDto) {
    return this.communityService.vote(req.user.id, postId, dto.optionId);
  }

  private parseCreatePostDto(body: Record<string, unknown>): CreatePostDto {
    const content = typeof body.content === 'string' ? body.content : '';
    const pollQuestion = typeof body.pollQuestion === 'string' ? body.pollQuestion : undefined;
    const pollEndsAt = typeof body.pollEndsAt === 'string' ? body.pollEndsAt : undefined;

    const rawOptions = body.pollOptions;
    let pollOptions: string[] | undefined;

    if (Array.isArray(rawOptions)) {
      pollOptions = rawOptions.map((value) => String(value));
    } else if (typeof rawOptions === 'string' && rawOptions.trim()) {
      const raw = rawOptions.trim();
      if (raw.startsWith('[') && raw.endsWith(']')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            pollOptions = parsed.map((value) => String(value));
          }
        } catch {
          throw new BadRequestException('pollOptions JSON is invalid');
        }
      } else {
        pollOptions = raw
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
      }
    }

    return {
      content,
      pollQuestion,
      pollEndsAt,
      pollOptions,
    };
  }
}
