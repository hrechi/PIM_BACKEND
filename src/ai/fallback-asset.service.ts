import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

type FallbackModelInfo = {
  usage: string[];
  hpRange?: [number, number];
};

type FallbackBrandInfo = {
  category: string;
  models: Record<string, FallbackModelInfo>;
};

type FallbackDataset = {
  brands: Record<string, FallbackBrandInfo>;
};

@Injectable()
export class FallbackAssetService implements OnModuleInit {
  private readonly logger = new Logger(FallbackAssetService.name);
  private readonly datasetPath = join(process.cwd(), 'fallback_assets_large.json');
  private dataset: FallbackDataset = { brands: {} };
  private normalizedBrandLookup = new Map<string, string>();
  private normalizedModelLookup = new Map<string, Array<{ brand: string; model: string }>>();

  onModuleInit() {
    this.loadDataset();
  }

  private normalize(value?: string): string {
    return (value || '').trim().toLowerCase();
  }

  private loadDataset() {
    if (!existsSync(this.datasetPath)) {
      this.logger.warn(`Fallback dataset not found at ${this.datasetPath}`);
      return;
    }

    const raw = readFileSync(this.datasetPath, 'utf8');
    this.dataset = JSON.parse(raw) as FallbackDataset;
    this.rebuildIndexes();
    this.logger.log(
      `Loaded fallback dataset with ${Object.keys(this.dataset.brands).length} brands`,
    );
  }

  private rebuildIndexes() {
    this.normalizedBrandLookup.clear();
    this.normalizedModelLookup.clear();

    for (const [brand, info] of Object.entries(this.dataset.brands)) {
      this.normalizedBrandLookup.set(this.normalize(brand), brand);
      for (const model of Object.keys(info.models || {})) {
        const key = this.normalize(model);
        const list = this.normalizedModelLookup.get(key) ?? [];
        list.push({ brand, model });
        this.normalizedModelLookup.set(key, list);
      }
    }
  }

  private unique(items: string[]): string[] {
    return [...new Set(items.filter(Boolean))];
  }

  getAllBrands(): string[] {
    return Object.keys(this.dataset.brands);
  }

  searchBrands(query: string): string[] {
    const normalizedQuery = this.normalize(query);
    if (!normalizedQuery) return this.getAllBrands().slice(0, 30);
    return this.getAllBrands().filter((brand) =>
      this.normalize(brand).includes(normalizedQuery),
    );
  }

  getModelsByBrand(brand: string): string[] {
    const canonicalBrand = this.normalizedBrandLookup.get(this.normalize(brand));
    if (!canonicalBrand) return [];
    return Object.keys(this.dataset.brands[canonicalBrand]?.models ?? {});
  }

  searchModels(brand: string, query: string): string[] {
    const normalizedQuery = this.normalize(query);
    return this.getModelsByBrand(brand).filter((model) =>
      this.normalize(model).includes(normalizedQuery),
    );
  }

  getModelDetails(brand: string, model: string): FallbackModelInfo | null {
    const canonicalBrand = this.normalizedBrandLookup.get(this.normalize(brand));
    if (!canonicalBrand) return null;
    return this.dataset.brands[canonicalBrand]?.models?.[model] ?? null;
  }

  getBrandCategory(brand: string): string | null {
    const canonicalBrand = this.normalizedBrandLookup.get(this.normalize(brand));
    if (!canonicalBrand) return null;
    return this.dataset.brands[canonicalBrand]?.category ?? null;
  }

  getSuggestions(input: { brand?: string; model?: string; category?: string }) {
    const brandQuery = input.brand?.trim() ?? '';
    const modelQuery = input.model?.trim() ?? '';
    const categoryQuery = input.category?.trim() ?? '';

    const brands = this.searchBrands(brandQuery);
    const models: string[] = [];
    const categories: string[] = [];
    const usage: string[] = [];

    const brandScope = brandQuery
      ? brands
      : this.getAllBrands().slice(0, 15);

    for (const brand of brandScope) {
      const info = this.dataset.brands[brand];
      if (!info) continue;

      if (!categoryQuery || this.normalize(info.category).includes(this.normalize(categoryQuery))) {
        categories.push(info.category);
      }

      const brandModels = modelQuery
        ? this.searchModels(brand, modelQuery)
        : Object.keys(info.models || {}).slice(0, 8);

      for (const model of brandModels) {
        models.push(model);
        usage.push(...(info.models?.[model]?.usage ?? []));
      }
    }

    return {
      brands: this.unique(brands).slice(0, 12),
      models: this.unique(models).slice(0, 12),
      categories: this.unique(categories).slice(0, 6),
      suggestions: {
        usage: this.unique(usage).slice(0, 8),
        notes: [],
      },
    };
  }

  validateAgainstDataset(input: {
    brand?: string;
    model?: string;
    category?: string;
    operatingHours?: number;
    mileage?: number;
  }) {
    const issues: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const brand = input.brand?.trim() ?? '';
    const model = input.model?.trim() ?? '';
    const category = input.category?.trim() ?? '';
    const operatingHours = Number(input.operatingHours);
    const mileage = Number(input.mileage);

    const canonicalBrand = this.normalizedBrandLookup.get(this.normalize(brand));
    if (!brand || !canonicalBrand) {
      issues.push('Brand is not recognized in the fallback catalog.');
      suggestions.push('Use a known agricultural brand or verify spelling.');
      return {
        valid: false,
        confidence: 0.35,
        issues,
        warnings,
        suggestions,
      };
    }

    const brandInfo = this.dataset.brands[canonicalBrand];
    const modelDetails = model ? this.getModelDetails(canonicalBrand, model) : null;
    if (model && !modelDetails) {
      issues.push(`Model ${model} is not recognized for ${canonicalBrand}.`);
      suggestions.push(`Try one of: ${this.getModelsByBrand(canonicalBrand).slice(0, 5).join(', ')}`);
    }

    if (category && this.normalize(category) !== this.normalize(brandInfo.category)) {
      warnings.push(`Category ${category} does not match ${canonicalBrand} catalog category ${brandInfo.category}.`);
    }

    if (modelDetails?.hpRange && !Number.isNaN(operatingHours)) {
      const [minHp, maxHp] = modelDetails.hpRange;
      if (operatingHours < minHp || operatingHours > maxHp * 150) {
        warnings.push('Operating hours/hp-like value is outside the expected range for this model.');
      }
    }

    if (!Number.isNaN(mileage) && mileage < 0) {
      issues.push('Mileage cannot be negative.');
    }

    const valid = issues.length === 0;
    const confidence = valid ? (warnings.length > 0 ? 0.78 : 0.92) : 0.3;

    return {
      valid,
      confidence,
      issues,
      warnings,
      suggestions,
    };
  }
}
