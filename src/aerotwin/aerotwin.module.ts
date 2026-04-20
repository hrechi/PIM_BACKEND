import { Module } from '@nestjs/common';
import { AeroTwinService } from './aerotwin.service';
import { AeroTwinController } from './aerotwin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [AeroTwinController],
  providers: [AeroTwinService],
})
export class AeroTwinModule {}
