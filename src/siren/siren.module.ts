import { Module } from '@nestjs/common';
import { SirenGateway } from './siren.gateway';

@Module({
  providers: [SirenGateway],
})
export class SirenModule {}
