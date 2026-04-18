import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FallbackAssetService } from './fallback-asset.service';
import { AiValidationService } from './ai-validation.service';
import { AiSuggestService } from './ai-suggest.service';
import { AiController } from './ai.controller';

@Module({
  imports: [HttpModule],
  controllers: [AiController],
  providers: [FallbackAssetService, AiValidationService, AiSuggestService],
  exports: [FallbackAssetService, AiValidationService, AiSuggestService],
})
export class AiModule {}
