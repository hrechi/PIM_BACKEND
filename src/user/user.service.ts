import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, refreshToken, ...sanitized } = user;
    return sanitized;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
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

  async updateProfilePicture(userId: string, filePath: string) {
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
}
