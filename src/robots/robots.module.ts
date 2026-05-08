import { Module } from '@nestjs/common';
import { RobotsController } from './robots.controller';
import { RobotsMapsController } from './robots-maps.controller';

@Module({
  controllers: [RobotsController, RobotsMapsController],
})
export class RobotsModule {}
