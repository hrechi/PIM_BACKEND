import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { SoilController } from './soil.controller';
import { SoilService } from './soil.service';
import { SoilAiService } from './soil-ai.service';
import { SoilMeasurement } from './soil.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SoilMeasurement]),
    HttpModule,
  ],
  controllers: [SoilController],
  providers: [SoilService, SoilAiService],
  exports: [SoilService, SoilAiService],
})
export class SoilModule {}
