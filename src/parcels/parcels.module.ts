import { Module } from '@nestjs/common';
import { ParcelsService } from './parcels.service';
import { ParcelsController } from './parcels.controller';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ParcelsController],
  providers: [ParcelsService],
})
export class ParcelsModule { }
