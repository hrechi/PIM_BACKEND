import { Module } from '@nestjs/common';
import { HealthScoreController } from './health-score.controller';
import { HealthScoreService } from './health-score.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HealthScoreController],
  providers: [HealthScoreService],
})
export class HealthScoreModule {}
