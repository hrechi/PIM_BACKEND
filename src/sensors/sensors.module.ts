import { Module } from '@nestjs/common';
import { SensorSimulatorService } from './sensor-simulator.service';
import { SensorsController } from './sensors.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SensorsController],
  providers: [SensorSimulatorService],
  exports: [SensorSimulatorService],
})
export class SensorsModule {}
