import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ParcelsService } from './parcels.service';
import { ParcelsController } from './parcels.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SoilModule } from '../soil/soil.module';
import { CropSuitabilityService } from '../crop-suitability/crop-suitability.service';

@Module({
  imports: [PrismaModule, ConfigModule, SoilModule],
  controllers: [ParcelsController],
  providers: [ParcelsService, CropSuitabilityService],
})
export class ParcelsModule {}
