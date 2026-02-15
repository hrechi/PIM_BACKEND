import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async addStaff(userId: string, name: string, imagePath: string) {
    const staff = await this.prisma.whitelistStaff.create({
      data: {
        name,
        imagePath,
        userId,
      },
    });
    return staff;
  }

  async getAllStaff(userId: string) {
    return this.prisma.whitelistStaff.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteStaff(userId: string, staffId: string) {
    const staff = await this.prisma.whitelistStaff.findFirst({
      where: { id: staffId, userId },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    await this.prisma.whitelistStaff.delete({
      where: { id: staffId },
    });

    return { message: 'Staff member removed from whitelist' };
  }
}
