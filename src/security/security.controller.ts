import { Controller, Get, Post, UseGuards, Req, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const AI_TOKEN_FILE = path.join(os.homedir(), '.pim_jwt_token');

@ApiTags('Security Sync')
@Controller('security')
@UseGuards(JwtAuthGuard)
export class SecurityController {
  constructor(private prisma: PrismaService) {}

  /**
   * Called by the Flutter app right after login/signup.
   * Saves the user's JWT to a local file so the AI engine can read it.
   */
  @Post('register-ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register current user token for AI engine' })
  @ApiResponse({ status: 201, description: 'Token saved for AI engine' })
  async registerAi(
    @Req() req: any,
    @Headers('authorization') authHeader: string,
  ) {
    const token = authHeader?.replace('Bearer ', '') || '';
    const userName = req.user.name || req.user.email || 'unknown';

    try {
      fs.writeFileSync(AI_TOKEN_FILE, token, { encoding: 'utf-8' });
      console.log(`[AI] Token registered for user "${userName}" → ${AI_TOKEN_FILE}`);
      return {
        message: `AI engine will now monitor ${userName}'s farm`,
        user: userName,
      };
    } catch (err) {
      console.error('[AI] Failed to save token file:', err);
      return { message: 'Token registered (file save failed, use env var)' };
    }
  }

  /**
   * Returns whitelisted staff members belonging to the authenticated user.
   * The AI engine must send the JWT token of the account it's monitoring.
   */
  @Get('sync')
  @ApiOperation({ summary: 'Get whitelisted faces for AI recognition (per user)' })
  @ApiResponse({ status: 200, description: 'List of staff with image paths for the logged-in user' })
  async syncStaff(@Req() req: any) {
    const userId = req.user.id;
    const staff = await this.prisma.whitelistStaff.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        imagePath: true,
      },
    });
    return staff;
  }
}
