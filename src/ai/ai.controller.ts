import { Controller, Post, Body, HttpException } from '@nestjs/common';
import { AiValidationService } from './ai-validation.service';
import { AiSuggestService } from './ai-suggest.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiValidationService: AiValidationService,
    private readonly aiSuggestService: AiSuggestService,
  ) {}

  @Post('validate-asset')
  async validateAsset(@Body() assetData: any) {
    try {
      return await this.aiValidationService.validateAsset(assetData);
    } catch (error) {
      throw new HttpException(error.message, error.status || 500);
    }
  }

  @Post('diagnose-asset')
  async diagnoseAsset(@Body() diagnoseData: any) {
    try {
      return await this.aiValidationService.diagnoseAsset(diagnoseData);
    } catch (error) {
      throw new HttpException(error.message, error.status || 500);
    }
  }

  @Post('suggest-asset')
  async suggestAsset(@Body() suggestData: any) {
    try {
      return await this.aiSuggestService.suggestAsset(suggestData);
    } catch (error) {
      throw new HttpException(error.message, error.status || 500);
    }
  }
}
