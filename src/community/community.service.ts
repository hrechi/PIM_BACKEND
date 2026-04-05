import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommunityPostType,
  CommunityReactionType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ReactionTypeDto } from './dto/react.dto';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async createPost(userId: string, dto: CreatePostDto, imagePath?: string) {
    const normalizedContent = (dto.content ?? '').trim();
    const pollOptions = (dto.pollOptions ?? [])
      .map((option) => option.trim())
      .filter((option) => option.length > 0)
      .slice(0, 6);

    const isVote = pollOptions.length >= 2;

    if (dto.pollOptions && dto.pollOptions.length > 0 && !isVote) {
      throw new BadRequestException('Vote post requires at least 2 poll options');
    }

    if (isVote && !dto.pollQuestion?.trim()) {
      throw new BadRequestException('pollQuestion is required for vote posts');
    }

    if (!isVote && !normalizedContent) {
      throw new BadRequestException('content is required for normal posts');
    }

    if (isVote && imagePath) {
      throw new BadRequestException('Vote posts cannot include an image');
    }

    const effectiveContent = isVote
      ? (normalizedContent || dto.pollQuestion!.trim())
      : normalizedContent;

    const created = await this.prisma.communityPost.create({
      data: {
        authorId: userId,
        content: effectiveContent,
        imagePath: isVote ? null : imagePath,
        type: isVote ? CommunityPostType.VOTE : CommunityPostType.STANDARD,
        pollQuestion: isVote ? dto.pollQuestion?.trim() : null,
        pollEndsAt: isVote && dto.pollEndsAt ? new Date(dto.pollEndsAt) : null,
        pollOptions: isVote
          ? {
              create: pollOptions.map((text, index) => ({
                text,
                position: index,
              })),
            }
          : undefined,
      },
      include: {
        author: {
          select: { id: true, name: true, profilePicture: true, farmName: true },
        },
        pollOptions: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return {
      ...this.mapPost(created),
      myReaction: null,
      myVoteOptionId: null,
    };
  }

  async updatePost(userId: string, postId: string, dto: UpdatePostDto) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      select: { authorId: true, type: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    // Vote posts cannot be edited
    if (post.type === CommunityPostType.VOTE) {
      throw new BadRequestException('Vote posts cannot be edited');
    }

    const normalizedContent = (dto.content ?? '').trim();
    if (!normalizedContent) {
      throw new BadRequestException('content is required');
    }

    const updated = await this.prisma.communityPost.update({
      where: { id: postId },
      data: {
        content: normalizedContent,
      },
      include: {
        author: {
          select: { id: true, name: true, profilePicture: true, farmName: true },
        },
        pollOptions: {
          orderBy: { position: 'asc' },
        },
      },
    });

    // Fetch user's reaction and vote for this post
    const [myReaction, myVote] = await Promise.all([
      this.prisma.communityPostReaction.findUnique({
        where: { postId_userId: { postId, userId } },
        select: { type: true },
      }),
      this.prisma.communityPollVote.findUnique({
        where: { postId_userId: { postId, userId } },
        select: { optionId: true },
      }),
    ]);

    return {
      ...this.mapPost(updated),
      myReaction: myReaction?.type ?? null,
      myVoteOptionId: myVote?.optionId ?? null,
    };
  }

  async deletePost(userId: string, postId: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      select: { authorId: true, imagePath: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Delete post (cascades will handle comments, reactions, etc.)
    await this.prisma.communityPost.delete({
      where: { id: postId },
    });

    // Delete image file if it exists
    if (post.imagePath) {
      try {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(process.cwd(), post.imagePath.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        // Log error but don't fail the request if file deletion fails
        console.error('Error deleting image file:', error);
      }
    }

    return { success: true, message: 'Post deleted successfully' };
  }

  async listPosts(userId: string, limit = 10, offset = 0) {
    const posts = await this.prisma.communityPost.findMany({
      include: {
        author: {
          select: { id: true, name: true, profilePicture: true, farmName: true },
        },
        pollOptions: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const postIds = posts.map((post) => post.id);

    const [myReactions, myVotes] = await Promise.all([
      this.prisma.communityPostReaction.findMany({
        where: {
          userId,
          postId: { in: postIds.length > 0 ? postIds : ['__none__'] },
        },
        select: { postId: true, type: true },
      }),
      this.prisma.communityPollVote.findMany({
        where: {
          userId,
          postId: { in: postIds.length > 0 ? postIds : ['__none__'] },
        },
        select: { postId: true, optionId: true },
      }),
    ]);

    const reactionMap = new Map(myReactions.map((reaction) => [reaction.postId, reaction.type]));
    const voteMap = new Map(myVotes.map((vote) => [vote.postId, vote.optionId]));

    return posts.map((post) => ({
      ...this.mapPost(post),
      myReaction: reactionMap.get(post.id) ?? null,
      myVoteOptionId: voteMap.get(post.id) ?? null,
    }));
  }

  async reactToPost(userId: string, postId: string, type: ReactionTypeDto) {
    await this.ensurePost(postId);

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.communityPostReaction.findUnique({
        where: { postId_userId: { postId, userId } },
      });

      if (!existing) {
        await tx.communityPostReaction.create({
          data: { postId, userId, type: type as CommunityReactionType },
        });
        await tx.communityPost.update({
          where: { id: postId },
          data: type === ReactionTypeDto.LIKE ? { likesCount: { increment: 1 } } : { dislikesCount: { increment: 1 } },
        });
      } else if (existing.type === type) {
        await tx.communityPostReaction.delete({ where: { id: existing.id } });
        await tx.communityPost.update({
          where: { id: postId },
          data: type === ReactionTypeDto.LIKE ? { likesCount: { decrement: 1 } } : { dislikesCount: { decrement: 1 } },
        });
      } else {
        await tx.communityPostReaction.update({
          where: { id: existing.id },
          data: { type: type as CommunityReactionType },
        });
        await tx.communityPost.update({
          where: { id: postId },
          data:
            type === ReactionTypeDto.LIKE
              ? { likesCount: { increment: 1 }, dislikesCount: { decrement: 1 } }
              : { likesCount: { decrement: 1 }, dislikesCount: { increment: 1 } },
        });
      }

      const updated = await tx.communityPost.findUnique({
        where: { id: postId },
        select: { likesCount: true, dislikesCount: true },
      });

      const currentReaction = await tx.communityPostReaction.findUnique({
        where: { postId_userId: { postId, userId } },
        select: { type: true },
      });

      return {
        likesCount: updated?.likesCount ?? 0,
        dislikesCount: updated?.dislikesCount ?? 0,
        myReaction: currentReaction?.type ?? null,
      };
    });

    return result;
  }

  async createComment(userId: string, postId: string, dto: CreateCommentDto) {
    await this.ensurePost(postId);

    if (dto.parentCommentId) {
      const parent = await this.prisma.communityComment.findUnique({
        where: { id: dto.parentCommentId },
        select: { id: true, postId: true },
      });

      if (!parent || parent.postId !== postId) {
        throw new BadRequestException('Invalid parentCommentId');
      }
    }

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.communityComment.create({
        data: {
          postId,
          authorId: userId,
          parentCommentId: dto.parentCommentId,
          content: dto.content.trim(),
        },
        include: {
          author: {
            select: { id: true, name: true, profilePicture: true, farmName: true },
          },
          replies: {
            include: {
              author: {
                select: { id: true, name: true, profilePicture: true, farmName: true },
              },
            },
          },
        },
      });

      await tx.communityPost.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      });

      if (dto.parentCommentId) {
        await tx.communityComment.update({
          where: { id: dto.parentCommentId },
          data: { repliesCount: { increment: 1 } },
        });
      }

      return created;
    });

    return {
      ...this.mapComment(comment),
      myReaction: null,
    };
  }

  async listComments(userId: string, postId: string) {
    await this.ensurePost(postId);

    const comments = await this.prisma.communityComment.findMany({
      where: { postId, parentCommentId: null },
      include: {
        author: {
          select: { id: true, name: true, profilePicture: true, farmName: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, profilePicture: true, farmName: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const allIds: string[] = [];
    comments.forEach((comment) => {
      allIds.push(comment.id);
      comment.replies.forEach((reply) => allIds.push(reply.id));
    });

    const myReactions = await this.prisma.communityCommentReaction.findMany({
      where: {
        userId,
        commentId: { in: allIds.length > 0 ? allIds : ['__none__'] },
      },
      select: { commentId: true, type: true },
    });

    const reactionMap = new Map(myReactions.map((reaction) => [reaction.commentId, reaction.type]));

    return comments.map((comment) => this.mapCommentTree(comment, reactionMap));
  }

  async updateComment(userId: string, commentId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.communityComment.findUnique({
      where: { id: commentId },
      select: { authorId: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const normalizedContent = dto.content.trim();
    if (!normalizedContent) {
      throw new BadRequestException('Comment content is required');
    }

    const updated = await this.prisma.communityComment.update({
      where: { id: commentId },
      data: {
        content: normalizedContent,
      },
      include: {
        author: {
          select: { id: true, name: true, profilePicture: true, farmName: true },
        },
      },
    });

    // Fetch user's reaction for this comment
    const myReaction = await this.prisma.communityCommentReaction.findUnique({
      where: { commentId_userId: { commentId, userId } },
      select: { type: true },
    });

    return {
      ...this.mapComment(updated),
      myReaction: myReaction?.type ?? null,
    };
  }

  async deleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.communityComment.findUnique({
      where: { id: commentId },
      select: { authorId: true, postId: true, parentCommentId: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete this comment (cascades will delete its replies)
      await tx.communityComment.delete({
        where: { id: commentId },
      });

      // Update post comment count
      if (!comment.parentCommentId) {
        // If this is a top-level comment, decrement post count by 1 + number of its replies
        const repliesCount = await tx.communityComment.count({
          where: { parentCommentId: commentId },
        });

        await tx.communityPost.update({
          where: { id: comment.postId },
          data: { commentsCount: { decrement: 1 + repliesCount } },
        });
      } else {
        // If this is a reply, decrement parent's replies count
        await tx.communityComment.update({
          where: { id: comment.parentCommentId },
          data: { repliesCount: { decrement: 1 } },
        });

        // Also decrement post count
        await tx.communityPost.update({
          where: { id: comment.postId },
          data: { commentsCount: { decrement: 1 } },
        });
      }
    });

    return { success: true, message: 'Comment deleted successfully' };
  }

  async reactToComment(userId: string, commentId: string, type: ReactionTypeDto) {
    await this.ensureComment(commentId);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.communityCommentReaction.findUnique({
        where: { commentId_userId: { commentId, userId } },
      });

      if (!existing) {
        await tx.communityCommentReaction.create({
          data: { commentId, userId, type: type as CommunityReactionType },
        });
        await tx.communityComment.update({
          where: { id: commentId },
          data: type === ReactionTypeDto.LIKE ? { likesCount: { increment: 1 } } : { dislikesCount: { increment: 1 } },
        });
      } else if (existing.type === type) {
        await tx.communityCommentReaction.delete({ where: { id: existing.id } });
        await tx.communityComment.update({
          where: { id: commentId },
          data: type === ReactionTypeDto.LIKE ? { likesCount: { decrement: 1 } } : { dislikesCount: { decrement: 1 } },
        });
      } else {
        await tx.communityCommentReaction.update({
          where: { id: existing.id },
          data: { type: type as CommunityReactionType },
        });
        await tx.communityComment.update({
          where: { id: commentId },
          data:
            type === ReactionTypeDto.LIKE
              ? { likesCount: { increment: 1 }, dislikesCount: { decrement: 1 } }
              : { likesCount: { decrement: 1 }, dislikesCount: { increment: 1 } },
        });
      }

      const updated = await tx.communityComment.findUnique({
        where: { id: commentId },
        select: { likesCount: true, dislikesCount: true },
      });

      const currentReaction = await tx.communityCommentReaction.findUnique({
        where: { commentId_userId: { commentId, userId } },
        select: { type: true },
      });

      return {
        likesCount: updated?.likesCount ?? 0,
        dislikesCount: updated?.dislikesCount ?? 0,
        myReaction: currentReaction?.type ?? null,
      };
    });
  }

  async vote(userId: string, postId: string, optionId: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        pollOptions: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.type !== CommunityPostType.VOTE) {
      throw new BadRequestException('Post is not a vote post');
    }

    if (post.pollEndsAt && post.pollEndsAt < new Date()) {
      throw new BadRequestException('Poll has already ended');
    }

    const targetOption = post.pollOptions.find((option) => option.id === optionId);
    if (!targetOption) {
      throw new BadRequestException('Invalid optionId');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.communityPollVote.findUnique({
        where: { postId_userId: { postId, userId } },
      });

      if (!existing) {
        await tx.communityPollVote.create({
          data: { postId, optionId, userId },
        });
        await tx.communityPollOption.update({
          where: { id: optionId },
          data: { votesCount: { increment: 1 } },
        });
      } else if (existing.optionId !== optionId) {
        await tx.communityPollVote.update({
          where: { id: existing.id },
          data: { optionId },
        });
        await tx.communityPollOption.update({
          where: { id: existing.optionId },
          data: { votesCount: { decrement: 1 } },
        });
        await tx.communityPollOption.update({
          where: { id: optionId },
          data: { votesCount: { increment: 1 } },
        });
      }

      const options = await tx.communityPollOption.findMany({
        where: { postId },
        orderBy: { position: 'asc' },
      });

      const myVote = await tx.communityPollVote.findUnique({
        where: { postId_userId: { postId, userId } },
        select: { optionId: true },
      });

      return {
        options,
        myVoteOptionId: myVote?.optionId ?? null,
      };
    });

    return {
      postId,
      myVoteOptionId: result.myVoteOptionId,
      totalVotes: result.options.reduce((sum, option) => sum + option.votesCount, 0),
      options: result.options,
    };
  }

  private async ensurePost(postId: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  private async ensureComment(commentId: string) {
    const comment = await this.prisma.communityComment.findUnique({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  private mapPost(
    post: Prisma.CommunityPostGetPayload<{
      include: {
        author: { select: { id: true; name: true; profilePicture: true; farmName: true } };
        pollOptions: true;
      };
    }>,
  ) {
    return {
      id: post.id,
      type: post.type,
      content: post.content,
      imagePath: post.imagePath,
      commentsCount: post.commentsCount,
      likesCount: post.likesCount,
      dislikesCount: post.dislikesCount,
      pollQuestion: post.pollQuestion,
      pollEndsAt: post.pollEndsAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.author,
      pollOptions: post.pollOptions,
      totalVotes: post.pollOptions.reduce((sum, option) => sum + option.votesCount, 0),
    };
  }

  private mapCommentTree(
    comment: Prisma.CommunityCommentGetPayload<{
      include: {
        author: { select: { id: true; name: true; profilePicture: true; farmName: true } };
        replies: {
          include: { author: { select: { id: true; name: true; profilePicture: true; farmName: true } } };
        };
      };
    }>,
    reactionMap: Map<string, CommunityReactionType>,
  ) {
    return {
      ...this.mapComment(comment),
      myReaction: reactionMap.get(comment.id) ?? null,
      replies: comment.replies.map((reply) => ({
        ...this.mapComment(reply),
        myReaction: reactionMap.get(reply.id) ?? null,
      })),
    };
  }

  private mapComment(
    comment: Prisma.CommunityCommentGetPayload<{
      include: {
        author: { select: { id: true; name: true; profilePicture: true; farmName: true } };
      };
    }>,
  ) {
    return {
      id: comment.id,
      postId: comment.postId,
      parentCommentId: comment.parentCommentId,
      content: comment.content,
      likesCount: comment.likesCount,
      dislikesCount: comment.dislikesCount,
      repliesCount: comment.repliesCount,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: comment.author,
    };
  }
}
