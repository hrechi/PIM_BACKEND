import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SoilController } from './soil.controller';
import { SoilService } from './soil.service';
import { SoilMeasurement } from './soil.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SoilMeasurement])],
  controllers: [SoilController],
  providers: [SoilService],
  exports: [SoilService],
})
export class SoilModule {}
