import { Module } from '@nestjs/common';
import { RevenuesService } from './revenues.service';
import { RevenuesController } from './revenues.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RevenuesService],
  controllers: [RevenuesController],
  exports: [RevenuesService],
})
export class RevenuesModule {}
