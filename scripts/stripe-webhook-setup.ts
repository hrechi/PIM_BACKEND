/**
 * stripe-webhook-setup.ts
 * Run once:  npx ts-node scripts/stripe-webhook-setup.ts
 *
 * Registers the Fieldly webhook endpoint in Stripe and prints
 * the webhook signing secret to add to .env
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// Change this to your production URL when deploying
// For local dev, use the Stripe CLI: stripe listen --forward-to localhost:3000/api/billing/webhook
const WEBHOOK_URL = process.env.WEBHOOK_URL ?? 'https://your-server.com/api/billing/webhook';

const EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
];

async function main() {
  console.log('🔗 Registering Stripe webhook...\n');

  // Check if a webhook for this URL already exists
  const existing = await stripe.webhookEndpoints.list({ limit: 20 });
  const found = existing.data.find((w) => w.url === WEBHOOK_URL);

  if (found) {
    console.log(`⚠️  Webhook already exists for ${WEBHOOK_URL}`);
    console.log(`   ID: ${found.id}`);
    console.log(`   Status: ${found.status}`);
    console.log('\nTo get the signing secret, check your Stripe dashboard:');
    console.log('https://dashboard.stripe.com/test/webhooks\n');
    return;
  }

  const webhook = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: EVENTS,
    description: 'Fieldly PIM billing webhook',
  });

  console.log(`✅ Webhook created: ${webhook.id}`);
  console.log(`   URL: ${webhook.url}`);
  console.log(`   Events: ${EVENTS.join(', ')}\n`);
  console.log('─────────────────────────────────────────────────────────');
  console.log('Add this to your .env file:');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
  console.log('\n⚠️  This secret is shown ONCE. Save it now.\n');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
