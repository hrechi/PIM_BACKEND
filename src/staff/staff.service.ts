import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  private normalizeRole(role?: string) {
    if (!role) return 'WORKER';
    if (role.toUpperCase() === 'FARMER') return 'WORKER';
    return role.toUpperCase();
  }

  async addStaff(
    userId: string,
    payload: {
      name: string;
      username: string;
      password: string;
      role?: string;
      assignedFieldId?: string;
      imagePath: string;
    },
  ) {
    const username = payload.username.trim().toLowerCase();
    const existing = await (this.prisma as any).whitelistStaff.findFirst({
      where: { username },
    });

    if (existing) {
      throw new ConflictException('Username already exists');
    }

    if (payload.assignedFieldId) {
      const field = await this.prisma.field.findFirst({
        where: { id: payload.assignedFieldId, userId },
      });
      if (!field) {
        throw new BadRequestException('Assigned field not found for current user');
      }
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10);

    const staff = await (this.prisma as any).whitelistStaff.create({
      data: {
        name: payload.name,
        username,
        password: hashedPassword,
        role: this.normalizeRole(payload.role),
        assignedFieldId: payload.assignedFieldId || null,
        imagePath: payload.imagePath,
        userId,
      },
    });

    const { password, ...safeStaff } = staff;
    return safeStaff;
  }

  async getAllStaff(userId: string) {
    const rows = await (this.prisma as any).whitelistStaff.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        assignedField: {
          select: { id: true, name: true },
        },
      },
    });

    return rows.map((row: any) => {
      const { password, ...safeRow } = row;
      return safeRow;
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
