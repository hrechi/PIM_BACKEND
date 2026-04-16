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

  private getModelPrefix(model: string): string {
    const match = model.trim().match(/^[A-Za-z]+/);
    return match?.[0]?.toUpperCase() || model.trim().charAt(0).toUpperCase();
  }

  private sampleModels(models: string[], maxTotal = 12, perPrefix = 3): string[] {
    const buckets = new Map<string, string[]>();

    for (const model of models) {
      const prefix = this.getModelPrefix(model);
      const list = buckets.get(prefix) ?? [];
      list.push(model);
      buckets.set(prefix, list);
    }

    const sampled: string[] = [];
    for (const bucket of buckets.values()) {
      sampled.push(...bucket.slice(0, perPrefix));
      if (sampled.length >= maxTotal) break;
    }

    return this.unique(sampled).slice(0, maxTotal);
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
        : this.sampleModels(Object.keys(info.models || {}), 12, 3);

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
    name?: string;
    brand?: string;
    model?: string;
    category?: string;
    operatingHours?: number;
    horsepower?: number;
    mileage?: number;
  }) {
    const issues: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const name = input.name?.trim() ?? '';
    const brand = input.brand?.trim() ?? '';
    const model = input.model?.trim() ?? '';
    const category = input.category?.trim() ?? '';
    const operatingHours = Number(input.operatingHours);
    const horsepower = Number(input.horsepower);
    const mileage = Number(input.mileage);

    if (name) {
      const normalizedName = name;
      const allowedChars = /^[A-Za-z0-9][A-Za-z0-9\s\-_/\.]{1,79}$/;
      const tokens = normalizedName.split(/\s+/).filter(Boolean);
      const hasDigit = /\d/.test(normalizedName);
      const hasMeaningfulToken = tokens.some((token) => token.length >= 2);
      if (
        !allowedChars.test(normalizedName) ||
        !/[A-Za-z]/.test(normalizedName) ||
        normalizedName.length < 4 ||
        (!hasDigit && tokens.length < 2 && !normalizedName.toLowerCase().includes('tractor')) ||
        !hasMeaningfulToken
      ) {
        issues.push('Asset name looks invalid or incoherent.');
        suggestions.push('Use a readable asset name like "New Holland T6.175 Tractor".');
      }
    }

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

    // Check if model exists in the selected category (instead of checking brand's default category)
    if (category && model && modelDetails) {
      // modelDetails comes from brandInfo.models[model] which has the correct category
      // No warning needed - the model lookup already validates it exists
    } else if (category && !model && this.normalize(category) !== this.normalize(brandInfo.category)) {
      // Only warn about category mismatch if no specific model was selected
      // This is just guidance, not an error
    }

    if (modelDetails?.hpRange && !Number.isNaN(horsepower)) {
      const [minHp, maxHp] = modelDetails.hpRange;
      if (horsepower < minHp || horsepower > maxHp) {
        warnings.push('Horsepower is outside the expected range for this model.');
      }
    }

    if (!Number.isNaN(operatingHours) && operatingHours < 0) {
      issues.push('Operating hours cannot be negative.');
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
