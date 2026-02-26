import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ParcelsService } from './parcels.service';
import { ParcelsController } from './parcels.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [ParcelsController],
  providers: [ParcelsService],
})
export class ParcelsModule { }
