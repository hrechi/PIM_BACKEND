import { Module } from '@nestjs/common';
import { MilkProductionController } from './milk-production.controller';
import { MilkProductionService } from './milk-production.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [MilkProductionController],
    providers: [MilkProductionService],
    exports: [MilkProductionService],
})
export class MilkProductionModule { }
