import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CropRotationController } from './crop-rotation.controller';
import { CropRotationService } from './crop-rotation.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [CropRotationController],
  providers: [CropRotationService],
  exports: [CropRotationService],
})
export class CropRotationModule {}
