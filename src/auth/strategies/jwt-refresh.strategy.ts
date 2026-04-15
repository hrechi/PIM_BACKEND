import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET')!,
      passReqToCallback: true,
    } as any);
  }

  async validate(
    req: Request,
    payload: {
      sub: string;
      role?: string;
      workerId?: string;
      ownerId?: string;
      assignedFieldId?: string | null;
    },
  ) {
    const refreshToken = req.get('Authorization')?.replace('Bearer ', '').trim();

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.ownerId || payload.sub },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    if (payload.role === 'WORKER' || payload.role === 'FARMER') {
      const workerId = payload.workerId || payload.sub;
      const worker = await (this.prisma as any).whitelistStaff.findFirst({
        where: {
          id: workerId,
          role: { in: ['WORKER', 'FARMER'] },
          ...(payload.ownerId ? { userId: payload.ownerId } : {}),
        },
      });

      if (!worker) {
        throw new UnauthorizedException('Worker account not found');
      }
    }

    return {
      ...user,
      id: user.id,
      ownerId: user.id,
      currentRefreshToken: refreshToken,
      role: payload.role || 'OWNER',
      workerId: payload.workerId || null,
      staffId: payload.workerId || null,
      assignedFieldId: payload.assignedFieldId || null,
    };
  }
}
