import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateAssetDto) {
    const serialNumber = dto.serial_number.trim();

    const existing = await this.prisma.asset.findUnique({
      where: {
        userId_serialNumber: {
          userId,
          serialNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Serial number already exists for this account');
    }

    // Validate that the field exists and belongs to the current user (if provided)
    let fieldId: string | undefined;
    if (dto.field_id) {
      const field = await this.prisma.field.findFirst({
        where: { id: dto.field_id, userId },
      });

      if (!field) {
        throw new BadRequestException('Field not found for current user');
      }
      fieldId = dto.field_id;
    }

    let assignedStaffId: string | null = null;
    if (dto.assignedTo) {
      const staff = await this.prisma.whitelistStaff.findFirst({
        where: { id: dto.assignedTo, userId },
      });
      if (!staff) {
        throw new BadRequestException('Assigned staff not found for current user');
      }
      assignedStaffId = staff.id;
    }

    // Build the data object conditionally
    const createData: any = {
      userId,
      name: dto.name.trim(),
      category: dto.category.trim(),
      status: dto.status ?? AssetStatus.AVAILABLE,
      imageUrl: dto.image_url?.trim() || null,
      serialNumber,
      lastServiceDate: dto.last_service_date
        ? new Date(dto.last_service_date)
        : null,
      assignedToId: assignedStaffId,
    };

    // Only add fieldId if it's provided
    if (fieldId) {
      createData.fieldId = fieldId;
    }

    const asset = await this.prisma.asset.create({
      data: createData,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            imagePath: true,
          },
        },
        field: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.sanitize(asset);
  }

  async findAll(userId: string) {
    const assets = await this.prisma.asset.findMany({
      where: { userId },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            imagePath: true,
          },
        },
        field: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assets.map((asset) => this.sanitize(asset));
  }

  async update(userId: string, assetId: string, dto: UpdateAssetDto) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, userId },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const updateData: {
      status?: AssetStatus;
      assignedToId?: string | null;
      lastServiceDate?: Date | null;
    } = {};

    if (dto.status) {
      updateData.status = dto.status;
    }

    if (dto.last_service_date !== undefined) {
      updateData.lastServiceDate = dto.last_service_date
        ? new Date(dto.last_service_date)
        : null;
    }

    if (dto.assignedTo !== undefined) {
      if (dto.assignedTo === null || dto.assignedTo.trim() == '') {
        updateData.assignedToId = null;
      } else {
        const staff = await this.prisma.whitelistStaff.findFirst({
          where: { id: dto.assignedTo, userId },
        });
        if (!staff) {
          throw new BadRequestException(
            'Assigned staff not found for current user',
          );
        }
        updateData.assignedToId = staff.id;
      }
    }

    const updated = await this.prisma.asset.update({
      where: { id: assetId },
      data: updateData,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            imagePath: true,
          },
        },
      },
    });

    return this.sanitize(updated);
  }

  private sanitize(asset: any) {
    return {
      id: asset.id,
      name: asset.name,
      category: asset.category,
      status: asset.status,
      image_url: asset.imageUrl,
      serial_number: asset.serialNumber,
      last_service_date: asset.lastServiceDate,
      assignedTo: asset.assignedTo,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }
}
