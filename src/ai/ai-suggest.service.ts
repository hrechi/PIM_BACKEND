import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FallbackAssetService } from './fallback-asset.service';

type SuggestInput = {
  brand?: string;
  model?: string;
  category?: string;
};

type SuggestOutput = {
  brands: string[];
  models: string[];
  categories: string[];
  suggestions: {
    usage: string[];
    notes: string[];
  };
};

@Injectable()
export class AiSuggestService {
  private readonly logger = new Logger(AiSuggestService.name);
  private readonly pythonApiUrl =
    process.env.PYTHON_AI_API_URL || 'http://192.168.1.144:8000';

  constructor(
    private readonly httpService: HttpService,
    private readonly fallbackAssetService: FallbackAssetService,
  ) {}

  private unique(items: string[]): string[] {
    return [...new Set(items.filter(Boolean))];
  }

  private merge(base: SuggestOutput, ai?: Partial<SuggestOutput>): SuggestOutput {
    const baseCategories = this.unique([...(base.categories || [])]).slice(0, 10);
    const aiCategories = this.unique([...(ai?.categories || [])]).slice(0, 10);
    const categories = baseCategories.length > 0 ? baseCategories : aiCategories;

    return {
      brands: this.unique([...(base.brands || []), ...((ai?.brands) || [])]).slice(0, 20),
      models: this.unique([...(base.models || []), ...((ai?.models) || [])]).slice(0, 20),
      categories,
      suggestions: {
        usage: this.unique([...(base.suggestions?.usage || []), ...((ai?.suggestions?.usage) || [])]).slice(0, 10),
        notes: this.unique([...(base.suggestions?.notes || []), ...((ai?.suggestions?.notes) || [])]).slice(0, 10),
      },
    };
  }

  async suggestAsset(input: SuggestInput): Promise<SuggestOutput> {
    const base = this.fallbackAssetService.getSuggestions(input);
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.pythonApiUrl}/suggest-machine`, input, {
          timeout: 7000,
        }),
      );
      return this.merge(base, response.data as Partial<SuggestOutput>);
    } catch (error) {
      this.logger.warn('AI suggest request failed, using dataset output only.');
      return base;
    }
  }
}
