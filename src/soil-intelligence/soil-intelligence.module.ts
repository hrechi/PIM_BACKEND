import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SoilIntelligenceController } from './soil-intelligence.controller';
import { SoilIntelligenceService } from './soil-intelligence.service';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [SoilIntelligenceController],
  providers: [SoilIntelligenceService],
  exports: [SoilIntelligenceService],
})
export class SoilIntelligenceModule {}
