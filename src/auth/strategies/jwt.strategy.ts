import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: {
    sub: string;
    email?: string;
    role?: string;
    workerId?: string;
    ownerId?: string;
    assignedFieldId?: string | null;
  }) {
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

      const owner = await this.prisma.user.findUnique({
        where: { id: worker.userId },
      });

      if (!owner) {
        throw new UnauthorizedException('Worker owner account not found');
      }

      return {
        id: owner.id,
        ownerId: owner.id,
        staffId: worker.id,
        role: 'WORKER',
        workerId: worker.id,
        assignedFieldId: worker.assignedFieldId,
        name: worker.name,
        username: worker.username,
        email: worker.email ?? null,
        phone: worker.phone ?? null,
        profilePicture: worker.imagePath,
        farmName: owner.farmName,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.ownerId || payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      ...user,
      id: user.id,
      ownerId: user.id,
      role: 'OWNER',
      workerId: null,
      staffId: null,
      assignedFieldId: null,
    };
  }
}
