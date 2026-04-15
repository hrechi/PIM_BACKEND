import { Injectable, HttpException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FallbackAssetService } from './fallback-asset.service';

@Injectable()
export class AiValidationService {
  private readonly logger = new Logger(AiValidationService.name);
  private readonly pythonApiUrl =
    process.env.PYTHON_AI_API_URL || 'http://192.168.100.9:8000';

  constructor(
    private readonly httpService: HttpService,
    private readonly fallbackAssetService: FallbackAssetService,
  ) {}

  private unique(items: string[]): string[] {
    return [...new Set(items.filter(Boolean))];
  }

  private mergeValidation(base: any, ai?: any) {
    const isEmptyAiSignal =
      ai &&
      ai.valid === false &&
      Number(ai.confidence || 0) === 0 &&
      (ai.issues?.length || 0) === 0 &&
      (ai.warnings?.length || 0) === 0 &&
      (ai.suggestions?.length || 0) === 0;

    if (isEmptyAiSignal) {
      return base;
    }

    return {
      valid: ai?.valid === false ? false : base.valid,
      confidence: Number(ai?.confidence ?? base.confidence ?? 0.5),
      issues: this.unique([...(base.issues || []), ...(ai?.issues || [])]),
      warnings: this.unique([...(base.warnings || []), ...(ai?.warnings || [])]),
      suggestions: this.unique([...(base.suggestions || []), ...(ai?.suggestions || [])]),
    };
  }

  async validateAsset(assetData: any): Promise<any> {
    const base = this.fallbackAssetService.validateAgainstDataset({
      brand: assetData.brand,
      model: assetData.model,
      category: assetData.category ?? assetData.type,
      operatingHours: assetData.operatingHours ?? assetData.horsepower,
      mileage: assetData.mileage ?? assetData.usage,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.pythonApiUrl}/validate-machine`,
          assetData,
          { timeout: 7000 },
        ),
      );
      return this.mergeValidation(base, response.data);
    } catch (error) {
      this.logger.warn('OpenAI validation failed, dataset validation used.');
      return base;
    }
  }

  async diagnoseAsset(diagnoseData: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.pythonApiUrl}/diagnose-machine`,
          diagnoseData,
          { timeout: 7000 },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error('AI diagnostics failed.', error);
      throw new HttpException('AI diagnostics failed', 503);
    }
  }
}
