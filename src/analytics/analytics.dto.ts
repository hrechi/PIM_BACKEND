// ─────────────────────────────────────────────────────────────
// Harvest Analytics — Response DTOs
// ─────────────────────────────────────────────────────────────

/** One data-point in the yield-over-time trend for a single parcel */
export class YieldTrendDto {
  /** ISO date string (YYYY-MM) representing the harvest month */
  month: string;
  totalYield: number;
  yieldPerHectare: number;
  harvestCount: number;
}

/** Yield comparison across parcels for a given crop */
export class CropComparisonDto {
  parcelId: string;
  location: string;
  totalYield: number;
  avgYieldPerHectare: number;
  harvestCount: number;
}

/** Summary card data — farm-level aggregation */
export class BestParcelDto {
  id: string;
  location: string;
  totalYield: number;
}

export class YieldSummaryDto {
  totalYield: number;
  avgYieldPerHectare: number;
  totalHarvests: number;
  parcelCount: number;
  bestParcel: BestParcelDto | null;
  /** Monthly trend totals across all parcels for the home-screen sparkline */
  recentTrend: { month: string; totalYield: number }[];
}
