import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get all ratings with user details - for admin dashboard */
  async getAllRatings() {
    const ratings = await this.prisma.appRating.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, profilePicture: true } },
      },
    });

    return ratings.map((r) => ({
      id: r.id,
      rating: r.stars, // Map 'stars' to 'rating' for frontend compatibility
      comment: r.message,
      timestamp: r.createdAt.toISOString(),
      userName: r.user.name,
      userEmail: r.user.email,
      userId: r.user.id,
      avatarUrl: r.user.profilePicture,
    }));
  }

  /** Delete a rating by ID */
  async deleteRating(id: string) {
    try {
      const deleted = await this.prisma.appRating.delete({
        where: { id },
      });
      return !!deleted;
    } catch {
      return false;
    }
  }
}
