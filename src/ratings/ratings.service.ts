import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Submit a new rating. A user may submit multiple ratings over time. */
  async create(userId: string, stars: number, message?: string) {
    if (stars < 1 || stars > 5) {
      throw new BadRequestException('Stars must be between 1 and 5');
    }

    return this.prisma.appRating.create({
      data: { userId, stars, message: message?.trim() || null },
      include: {
        user: { select: { id: true, name: true, profilePicture: true } },
      },
    });
  }

  /** Return the latest N ratings (default 50), newest first. */
  async findAll(limit = 50) {
    const ratings = await this.prisma.appRating.findMany({
      take: Math.min(limit, 200),
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, profilePicture: true } },
      },
    });

    return ratings.map((r) => this.format(r));
  }

  /** Average star rating across all submissions. */
  async summary() {
    const agg = await this.prisma.appRating.aggregate({
      _avg: { stars: true },
      _count: { id: true },
    });
    return {
      average: agg._avg.stars ? Math.round(agg._avg.stars * 10) / 10 : 0,
      total: agg._count.id,
    };
  }

  private format(r: {
    id: string;
    stars: number;
    message: string | null;
    createdAt: Date;
    user: { id: string; name: string; profilePicture: string | null };
  }) {
    return {
      id: r.id,
      stars: r.stars,
      message: r.message,
      createdAt: r.createdAt,
      userName: r.user.name,
      userId: r.user.id,
      avatarUrl: r.user.profilePicture,
    };
  }
}
