import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async saveFcmToken(
    userId: string,
    token: string,
    authContext?: {
      workerId?: string | null;
      staffId?: string | null;
    },
  ) {
    const workerId = authContext?.workerId || authContext?.staffId;
    const worker = workerId
      ? await (this.prisma as any).whitelistStaff.findUnique({
          where: { id: workerId },
        })
      : null;

    if (worker) {
      await (this.prisma as any).whitelistStaff.update({
        where: { id: worker.id },
        data: { fcmToken: token },
      });
    } else if (workerId) {
      throw new NotFoundException('Worker not found');
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: { fcmToken: token },
      });
    }
    return { message: 'FCM token saved' };
  }

  async getProfile(
    userId: string,
    authContext?: {
      role?: string;
      assignedFieldId?: string | null;
      ownerId?: string;
      staffId?: string | null;
      workerId?: string | null;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (authContext?.workerId || authContext?.staffId) {
      const workerId = authContext.workerId || authContext.staffId;
      const worker = await (this.prisma as any).whitelistStaff.findUnique({
        where: { id: workerId },
      });

      if (worker) {
        return this.mapWorkerProfile(user, worker, authContext);
      }

      throw new NotFoundException('Worker not found');
    }

    return this.mapProfile(user, authContext);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    authContext?: {
      workerId?: string | null;
      staffId?: string | null;
      ownerId?: string;
    },
  ) {
    const workerId = authContext?.workerId || authContext?.staffId;
    const worker = workerId
      ? await (this.prisma as any).whitelistStaff.findUnique({
          where: { id: workerId },
        })
      : null;

    if (worker) {
      const updateData: any = {};
      if (dto.name) updateData.name = dto.name;
      if (dto.email !== undefined) updateData.email = dto.email || null;
      if (dto.phone !== undefined) updateData.phone = dto.phone || null;
      if (dto.password) {
        updateData.password = await bcrypt.hash(dto.password, 10);
      }

      const updatedWorker = await (this.prisma as any).whitelistStaff.update({
        where: { id: worker.id },
        data: updateData,
      });

      const owner = await this.prisma.user.findUnique({ where: { id: userId } });

      return this.mapWorkerProfile(owner, updatedWorker);
    }

    if (workerId) {
      throw new NotFoundException('Worker not found');
    }

    // Check email uniqueness if being updated
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id: userId } },
      });
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    // Check phone uniqueness if being updated
    if (dto.phone) {
      const existing = await this.prisma.user.findFirst({
        where: { phone: dto.phone, NOT: { id: userId } },
      });
      if (existing) {
        throw new ConflictException('Phone number already in use');
      }
    }

    // Build update data
    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.farmName) updateData.farmName = dto.farmName;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const { password, refreshToken, ...sanitized } = user;
    return sanitized;
  }

  async updateProfilePicture(
    userId: string,
    filePath: string,
    authContext?: {
      workerId?: string | null;
      staffId?: string | null;
      ownerId?: string;
    },
  ) {
    const workerId = authContext?.workerId || authContext?.staffId;
    const worker = workerId
      ? await (this.prisma as any).whitelistStaff.findUnique({
          where: { id: workerId },
        })
      : null;

    if (worker) {
      throw new ForbiddenException(
        'Workers are not allowed to change their profile picture',
      );
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { profilePicture: filePath },
    });

    const { password, refreshToken, ...sanitized } = user;
    return sanitized;
  }

  async deleteAccount(userId: string) {
    await this.prisma.user.delete({
      where: { id: userId },
    });
    return { message: 'Account deleted successfully' };
  }

  private mapProfile(user: any, authContext?: {
    role?: string;
    assignedFieldId?: string | null;
    ownerId?: string;
    staffId?: string | null;
    workerId?: string | null;
  }) {
    const { password, refreshToken, ...sanitized } = user;

    return {
      ...sanitized,
      role: authContext?.role || 'OWNER',
      assignedFieldId: authContext?.assignedFieldId || null,
      ownerId: authContext?.ownerId || user.id,
      staffId: authContext?.staffId || authContext?.workerId || null,
    };
  }

  private mapWorkerProfile(
    owner: any,
    worker: any,
    authContext?: {
      assignedFieldId?: string | null;
      ownerId?: string;
      staffId?: string | null;
      workerId?: string | null;
    },
  ) {
    if (!worker) {
      return {
        ...owner,
        role: 'WORKER',
        ownerId: authContext?.ownerId || owner.id,
        staffId: authContext?.staffId || authContext?.workerId || null,
        assignedFieldId: authContext?.assignedFieldId || null,
      };
    }

    return {
      id: owner.id,
      email: worker.email ?? null,
      name: worker.name,
      phone: worker.phone ?? null,
      farmName: owner.farmName,
      profilePicture: worker.imagePath,
      role: 'WORKER',
      username: worker.username,
      assignedFieldId: worker.assignedFieldId,
      ownerId: authContext?.ownerId || owner.id,
      staffId: worker.id,
      createdAt: worker.createdAt,
      updatedAt: worker.updatedAt,
    };
  }
}
