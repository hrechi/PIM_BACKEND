// ─────────────────────────────────────────────────────────────────────────────
//  Stripe Price IDs & plan metadata
//  Replace PRICE_xxx values with your real Stripe Price IDs once you create
//  them in the Stripe dashboard (Products → Add product).
// ─────────────────────────────────────────────────────────────────────────────

export const STRIPE_PRICES = {
  essential: {
    monthly: 'price_1TT8tBRYv1qsxS7gntP6cv1o',
    annual:  'price_1TT8tBRYv1qsxS7g07JjWMsU',
  },
  growth: {
    monthly: 'price_1TT8tCRYv1qsxS7gunLyAHFN',
    annual:  'price_1TT8tCRYv1qsxS7gcgbeoK6M',
  },
  operations_pro: {
    monthly: 'price_1TT8tDRYv1qsxS7gYwrVkmIk',
    annual:  'price_1TT8tDRYv1qsxS7goUVFFiRC',
  },
  robot_connect: {
    monthly: 'price_1TT8tERYv1qsxS7g2MuSlauf',
    annual:  'price_1TT8tERYv1qsxS7gwNcS66VB',
  },
  robot_autonomy: {
    monthly: 'price_1TT8tFRYv1qsxS7g2gU5pcSA',
    annual:  'price_1TT8tGRYv1qsxS7g4SRgAI2P',
  },
  robot_fleet: {
    monthly: 'price_1TT8tGRYv1qsxS7gfs9pNIfG',
    annual:  'price_1TT8tHRYv1qsxS7gr1nSxyz1',
  },
} as const;

export type PlanKey = 'essential' | 'growth' | 'operations_pro';
export type RobotTier = 'robot_connect' | 'robot_autonomy' | 'robot_fleet';

/** Human-readable plan names used in emails / UI copy */
export const PLAN_LABELS: Record<string, string> = {
  FREE:           'Free',
  ESSENTIAL:      'Essential',
  GROWTH:         'Growth',
  OPERATIONS_PRO: 'Operations Pro',
  ENTERPRISE:     'Enterprise',
};

/** Trial length in days */
export const TRIAL_DAYS = 14;
