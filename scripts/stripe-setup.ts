/**
 * stripe-setup.ts
 * Run once:  npx ts-node scripts/stripe-setup.ts
 *
 * Creates all Fieldly products + prices in your Stripe account and
 * prints the price IDs to paste into billing.constants.ts
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// ─── Product definitions ──────────────────────────────────────────────────────

const PRODUCTS = [
  // ── Platform plans ──────────────────────────────────────────────────────
  {
    key:         'essential',
    name:        'Fieldly Essential',
    description: 'Core dashboard, parcels (up to 10), animal tracking (up to 30), weather, community. 200 AI credits/mo, 5 GB, 2 users.',
    prices: [
      { label: 'monthly', amount: 2900,  interval: 'month' as const, nickname: 'Essential Monthly' },
      { label: 'annual',  amount: 29000, interval: 'year'  as const, nickname: 'Essential Annual (–18%)' },
    ],
  },
  {
    key:         'growth',
    name:        'Fieldly Growth',
    description: 'Everything in Essential + AI Agronomist, Plant Doctor, Irrigation scheduler, Milk analytics, Vaccination planning, Missions. 1,500 AI credits/mo, 50 GB, 6 users.',
    prices: [
      { label: 'monthly', amount: 8900,  interval: 'month' as const, nickname: 'Growth Monthly' },
      { label: 'annual',  amount: 87120, interval: 'year'  as const, nickname: 'Growth Annual (–18%)' },
    ],
  },
  {
    key:         'operations_pro',
    name:        'Fieldly Operations Pro',
    description: 'Everything in Growth + Advanced analytics, Security monitoring, Live feed, Whitelist, PDF/CSV export, Priority support. 5,000 AI credits/mo, 200 GB, 15 users.',
    prices: [
      { label: 'monthly', amount: 19900,  interval: 'month' as const, nickname: 'Ops Pro Monthly' },
      { label: 'annual',  amount: 195720, interval: 'year'  as const, nickname: 'Ops Pro Annual (–18%)' },
    ],
  },

  // ── Robot add-ons (per robot / month or year) ───────────────────────────
  {
    key:         'robot_connect',
    name:        'Fieldly Robot Connect',
    description: 'Live robot status, mission logs, basic alerts (low battery, offline), remote task start/stop. Per robot/month.',
    prices: [
      { label: 'monthly', amount: 4900, interval: 'month' as const, nickname: 'Robot Connect / robot / mo' },
      { label: 'annual',  amount: 49000, interval: 'year'  as const, nickname: 'Robot Connect / robot / yr (–18%)' },
    ],
  },
  {
    key:         'robot_autonomy',
    name:        'Fieldly Robot Autonomy',
    description: 'Everything in Robot Connect + Autonomous mission scheduling, route optimization, predictive maintenance, anomaly detection. Per robot/month.',
    prices: [
      { label: 'monthly', amount: 9900, interval: 'month' as const, nickname: 'Robot Autonomy / robot / mo' },
      { label: 'annual',  amount: 99000, interval: 'year'  as const, nickname: 'Robot Autonomy / robot / yr (–18%)' },
    ],
  },
  {
    key:         'robot_fleet',
    name:        'Fieldly Robot Fleet Control',
    description: 'Fleet dashboard, robot utilization KPIs, role-based permissions, audit logs, incident replay, Fleet SLA. Per farm/month.',
    prices: [
      { label: 'monthly', amount: 29900, interval: 'month' as const, nickname: 'Robot Fleet Control / farm / mo' },
      { label: 'annual',  amount: 299000, interval: 'year'  as const, nickname: 'Robot Fleet Control / farm / yr (–18%)' },
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Setting up Fieldly products in Stripe...\n');

  const result: Record<string, Record<string, string>> = {};

  for (const def of PRODUCTS) {
    // Create product
    const product = await stripe.products.create({
      name:        def.name,
      description: def.description,
      metadata:    { fieldly_key: def.key },
    });
    console.log(`✅ Product: ${product.name}  (${product.id})`);

    result[def.key] = {};

    for (const p of def.prices) {
      const price = await stripe.prices.create({
        product:    product.id,
        unit_amount: p.amount,
        currency:   'usd',
        recurring:  { interval: p.interval },
        nickname:   p.nickname,
        metadata:   { fieldly_key: def.key, label: p.label },
      });
      result[def.key][p.label] = price.id;
      console.log(`   💰 ${p.nickname}: ${price.id}`);
    }
    console.log('');
  }

  // ─── Print billing.constants.ts snippet ────────────────────────────────

  console.log('\n─────────────────────────────────────────────────────────');
  console.log('Copy the block below into src/billing/billing.constants.ts');
  console.log('─────────────────────────────────────────────────────────\n');

  console.log(`export const STRIPE_PRICES = {
  essential: {
    monthly: '${result.essential?.monthly}',
    annual:  '${result.essential?.annual}',
  },
  growth: {
    monthly: '${result.growth?.monthly}',
    annual:  '${result.growth?.annual}',
  },
  operations_pro: {
    monthly: '${result.operations_pro?.monthly}',
    annual:  '${result.operations_pro?.annual}',
  },
  robot_connect: {
    monthly: '${result.robot_connect?.monthly}',
    annual:  '${result.robot_connect?.annual}',
  },
  robot_autonomy: {
    monthly: '${result.robot_autonomy?.monthly}',
    annual:  '${result.robot_autonomy?.annual}',
  },
  robot_fleet: {
    monthly: '${result.robot_fleet?.monthly}',
    annual:  '${result.robot_fleet?.annual}',
  },
} as const;`);

  console.log('\n✅ Done! Paste the block above into billing.constants.ts\n');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
