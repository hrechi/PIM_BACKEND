import { Module } from '@nestjs/common';
import { MedicalEventsService } from './medical-events.service';
import { MedicalEventsController } from './medical-events.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MedicalEventsController],
  providers: [MedicalEventsService],
  exports: [MedicalEventsService],
})
export class MedicalEventsModule {}
