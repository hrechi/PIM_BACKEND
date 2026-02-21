import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Security Sync')
@Controller('security')
export class SecurityController {
  constructor(private prisma: PrismaService) {}

  /**
   * Public (no auth) endpoint consumed by the local AI brain.
   * Returns every whitelisted staff member with their name and image URL.
   */
  @Get('sync')
  @ApiOperation({ summary: 'Get all whitelisted faces for AI recognition' })
  @ApiResponse({ status: 200, description: 'List of staff with image paths' })
  async syncStaff() {
    const staff = await this.prisma.whitelistStaff.findMany({
      select: {
        id: true,
        name: true,
        imagePath: true,
      },
    });
    return staff;
  }
}
