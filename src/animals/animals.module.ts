import { Module } from '@nestjs/common';
import { AnimalsService } from './animals.service';
import { AnimalsController } from './animals.controller';
import { GroqModule } from '../groq/groq.module';

@Module({
  imports: [GroqModule],
  providers: [AnimalsService],
  controllers: [AnimalsController],
})
export class AnimalsModule {}
