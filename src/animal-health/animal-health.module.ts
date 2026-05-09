import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AnimalHealthService } from './animal-health.service';
import { AnimalHealthController } from './animal-health.controller';
import { HealthCronService } from './health-cron.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    HttpModule.register({
      timeout: 10_000,
      maxRedirects: 3,
    }),
  ],
  controllers: [AnimalHealthController],
  providers: [AnimalHealthService, HealthCronService],
  exports: [AnimalHealthService],
})
export class AnimalHealthModule {}
