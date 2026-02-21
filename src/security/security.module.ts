import { Module } from '@nestjs/common';
import { SecurityController } from './security.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SecurityController],
})
export class SecurityModule {}
