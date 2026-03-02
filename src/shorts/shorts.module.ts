import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ShortsController } from './shorts.controller';
import { ShortsService } from './shorts.service';

@Module({
  imports: [HttpModule],
  controllers: [ShortsController],
  providers: [ShortsService],
})
export class ShortsModule {}
