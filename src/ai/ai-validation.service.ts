import { Injectable, HttpException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FallbackAssetService } from './fallback-asset.service';

@Injectable()
export class AiValidationService {
  private readonly logger = new Logger(AiValidationService.name);
  private readonly pythonApiUrl =
    process.env.PYTHON_AI_API_URL || 'http://192.168.0.148:8000';

  constructor(
    private readonly httpService: HttpService,
    private readonly fallbackAssetService: FallbackAssetService,
  ) {}

  private unique(items: string[]): string[] {
    return [...new Set(items.filter(Boolean))];
  }

  private isNameValidationMessage(message: string): boolean {
    const value = message.toLowerCase();
    return value.includes('asset name') || value.includes('name looks invalid');
  }

  private stripNameValidation(data: any) {
    return {
      ...data,
      issues: (data?.issues || []).filter(
        (item: string) => !this.isNameValidationMessage(String(item)),
      ),
      warnings: (data?.warnings || []).filter(
        (item: string) => !this.isNameValidationMessage(String(item)),
      ),
      suggestions: (data?.suggestions || []).filter((item: string) => {
        const normalized = String(item).toLowerCase();
        return !normalized.includes('readable asset name') && !normalized.includes('asset name');
      }),
    };
  }

  private mergeValidation(base: any, ai?: any) {
    const cleanedBase = this.stripNameValidation(base);
    const cleanedAi = this.stripNameValidation(ai);

    const isEmptyAiSignal =
      cleanedAi &&
      cleanedAi.valid === false &&
      Number(cleanedAi.confidence || 0) === 0 &&
      (cleanedAi.issues?.length || 0) === 0 &&
      (cleanedAi.warnings?.length || 0) === 0 &&
      (cleanedAi.suggestions?.length || 0) === 0;

    if (isEmptyAiSignal) {
      return cleanedBase;
    }

    return {
      valid: cleanedAi?.valid === false ? false : cleanedBase.valid,
      confidence: Number(cleanedAi?.confidence ?? cleanedBase.confidence ?? 0.5),
      issues: this.unique([...(cleanedBase.issues || []), ...(cleanedAi?.issues || [])]),
      warnings: this.unique([...(cleanedBase.warnings || []), ...(cleanedAi?.warnings || [])]),
      suggestions: this.unique([...(cleanedBase.suggestions || []), ...(cleanedAi?.suggestions || [])]),
    };
  }

  async validateAsset(assetData: any): Promise<any> {
    const base = this.fallbackAssetService.validateAgainstDataset({
      name: assetData.name,
      brand: assetData.brand,
      model: assetData.model,
      category: assetData.category ?? assetData.type,
      operatingHours: assetData.operatingHours,
      horsepower: assetData.horsepower,
      mileage: assetData.mileage ?? assetData.usage,
    });

    try {
      const timeoutMs = assetData?.imageBase64 ? 25000 : 7000;
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.pythonApiUrl}/validate-machine`,
          assetData,
          { timeout: timeoutMs },
        ),
      );
      return {
        ...this.mergeValidation(base, response.data),
        source: 'ai',
      };
    } catch (error) {
      const errorMessage =
        (error as any)?.message ||
        (error as any)?.response?.data?.message ||
        'unknown error';
      this.logger.warn(
        `AI validation failed (${this.pythonApiUrl}/validate-machine): ${errorMessage}. Dataset validation used.`,
      );
      return {
        ...base,
        source: 'fallback',
      };
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
