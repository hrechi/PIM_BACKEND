import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutDto, PlanId, RobotTierId } from './dto/create-checkout.dto';
import { STRIPE_PRICES, PLAN_LABELS } from './billing.constants';
import { EmailService } from '../email/email.service';

@Injectable()
export class BillingService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.stripe = new Stripe(this.config.getOrThrow<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2025-02-24.acacia',
    });
  }

  // ─── Create Stripe Checkout Session ──────────────────────────────────────

  async createCheckoutSession(userId: string, dto: CreateCheckoutDto) {
    if (dto.plan === PlanId.ENTERPRISE) {
      throw new BadRequestException(
        'Enterprise plans require a direct sales conversation. Please contact us.',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Get or create Stripe customer
    const customerId = await this._getOrCreateCustomer(userId, user.email ?? '', user.name);

    // Build line items
    const lineItems = this._buildLineItems(dto);

    // Determine success / cancel URLs.
    // Keep the checkout redirect on an HTTP page, then let that page open the app via deep link.
    const publicUrl = this.config.get<string>('PUBLIC_APP_URL') ?? 'http://192.168.100.9:3000';
    const successUrl = dto.successUrl ?? `${publicUrl}/api/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl  = dto.cancelUrl  ?? `${publicUrl}/api/billing/cancel`;

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: lineItems,
      subscription_data: {
        metadata: {
          userId,
          plan: dto.plan,
          annual: String(dto.annual),
        },
      },
      success_url: successUrl,
      cancel_url:  cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        userId,
        plan: dto.plan,
        annual: String(dto.annual),
      },
    });

    this.logger.log(`Checkout session created for user ${userId}: ${session.id}`);
    return { sessionId: session.id, url: session.url };
  }

  // ─── Customer Portal (manage / upgrade / cancel) ─────────────────────────

  async createPortalSession(userId: string, returnUrl?: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub?.stripeCustomerId) {
      throw new BadRequestException('No active subscription found. Please subscribe first.');
    }

    const publicUrl = this.config.get<string>('PUBLIC_APP_URL') ?? 'http://192.168.100.9:3000';
    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl ?? `${publicUrl}/api/billing/portal-return`,
    });

    return { url: session.url };
  }

  // ─── Get current subscription status ─────────────────────────────────────

  async getSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!sub) {
      return {
        plan: 'FREE',
        status: 'TRIALING',
        billingInterval: 'MONTHLY',
        trialEndsAt: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        robotAddOns: [],
      };
    }

    return {
      plan: sub.plan,
      status: sub.status,
      billingInterval: sub.billingInterval,
      trialEndsAt: sub.trialEndsAt,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      robotAddOns: sub.robotAddOns ?? [],
    };
  }

  getSuccessPage(sessionId?: string) {
    const appScheme = this.config.get<string>('APP_SCHEME') ?? 'fieldly';
    const webHomeUrl =
      this.config.get<string>('APP_HOME_URL') ??
      this.config.get<string>('PUBLIC_APP_URL') ??
      '';
    const deepLink = `${appScheme}://billing-return${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''}`;
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Payment successful</title>
    <script>
      window.addEventListener('DOMContentLoaded', function () {
        const deepLink = ${JSON.stringify(deepLink)};
        setTimeout(function () {
          window.location.href = deepLink;
        }, 600);
      });
    </script>
    <style>
      body { font-family: Arial, sans-serif; padding: 32px; background: #f7faf7; color: #16331f; }
      .card { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 20px; padding: 28px; box-shadow: 0 8px 30px rgba(0,0,0,.08); }
      .badge { display:inline-block; padding:8px 12px; border-radius:999px; background:#e9f8ee; color:#1a7f37; font-weight:700; margin-bottom:16px; }
      h1 { margin: 0 0 12px; font-size: 28px; }
      p { line-height: 1.5; color: #4a5a4f; }
      code { word-break: break-all; }
      .actions { display:flex; gap:12px; flex-wrap:wrap; margin-top:20px; }
      .button { display:inline-block; padding:12px 18px; border-radius:999px; text-decoration:none; font-weight:700; }
      .button.primary { background: linear-gradient(90deg, #2ECC71, #3498DB); color:#fff; }
      .button.secondary { background:#eef4ef; color:#16331f; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="badge">Payment completed</div>
      <h1>Thanks. Your Stripe payment was received.</h1>
      <p>You can now return to the Fieldly app. This page will try to open the app automatically.</p>
      ${sessionId ? `<p>Session: <code>${sessionId}</code></p>` : ''}
      <div class="actions">
        <a class="button primary" href="${deepLink}">Open App</a>
        ${webHomeUrl ? `<a class="button secondary" href="${webHomeUrl}">Back to Web</a>` : ''}
      </div>
    </div>
  </body>
</html>`;
  }

  getCancelPage() {
    const homeUrl =
      this.config.get<string>('APP_HOME_URL') ??
      this.config.get<string>('PUBLIC_APP_URL') ??
      '';
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Payment canceled</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 32px; background: #fffaf7; color: #4a2b1d; }
      .card { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 20px; padding: 28px; box-shadow: 0 8px 30px rgba(0,0,0,.08); }
      .badge { display:inline-block; padding:8px 12px; border-radius:999px; background:#fff1e8; color:#b45309; font-weight:700; margin-bottom:16px; }
      h1 { margin: 0 0 12px; font-size: 28px; }
      p { line-height: 1.5; color: #6b4e3d; }
      .button { display:inline-block; margin-top:18px; padding:12px 18px; border-radius:999px; text-decoration:none; font-weight:700; background:#4a2b1d; color:#fff; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="badge">Canceled</div>
      <h1>Your payment was canceled.</h1>
      <p>No charge was made. You can go back to the app and try again whenever you want.</p>
      ${homeUrl ? `<a class="button" href="${homeUrl}">Back to Home</a>` : ''}
    </div>
  </body>
</html>`;
  }

  // ─── Stripe Webhook Handler ───────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this._onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await this._onSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this._onSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await this._onPaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.paid':
        await this._onInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  // ─── Private: webhook handlers ───────────────────────────────────────────

  private async _onCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    if (!userId) return;

    const stripeSubId = session.subscription as string;
    const stripeSub   = await this.stripe.subscriptions.retrieve(stripeSubId);

    const plan     = this._mapPlanFromMetadata(session.metadata?.plan ?? '');
    const annual   = session.metadata?.annual === 'true';
    const robotAddOns = this._extractRobotAddOns(stripeSub);

    await this.prisma.subscription.upsert({
      where:  { userId },
      create: {
        userId,
        stripeCustomerId:     session.customer as string,
        stripeSubscriptionId: stripeSubId,
        plan,
        status:               'TRIALING',
        billingInterval:      annual ? 'ANNUAL' : 'MONTHLY',
        robotAddOns,
        trialEndsAt:          stripeSub.trial_end
                                ? new Date(stripeSub.trial_end * 1000)
                                : null,
        currentPeriodStart:   new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd:     new Date(stripeSub.current_period_end   * 1000),
      },
      update: {
        stripeCustomerId:     session.customer as string,
        stripeSubscriptionId: stripeSubId,
        plan,
        status:               'TRIALING',
        billingInterval:      annual ? 'ANNUAL' : 'MONTHLY',
        robotAddOns,
        trialEndsAt:          stripeSub.trial_end
                                ? new Date(stripeSub.trial_end * 1000)
                                : null,
        currentPeriodStart:   new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd:     new Date(stripeSub.current_period_end   * 1000),
      },
    });

    this.logger.log(`✅ Subscription activated for user ${userId} — plan: ${plan}`);
  }

  private async _onSubscriptionUpdated(stripeSub: Stripe.Subscription) {
    const sub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSub.id },
    });
    if (!sub) return;

    const status      = this._mapStatus(stripeSub.status);
    const robotAddOns = this._extractRobotAddOns(stripeSub);

    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: stripeSub.id },
      data: {
        status,
        robotAddOns,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        canceledAt:        stripeSub.canceled_at
                             ? new Date(stripeSub.canceled_at * 1000)
                             : null,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
        trialEndsAt:        stripeSub.trial_end
                              ? new Date(stripeSub.trial_end * 1000)
                              : null,
      },
    });
  }

  private async _onSubscriptionDeleted(stripeSub: Stripe.Subscription) {
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSub.id },
      data:  { status: 'CANCELED', canceledAt: new Date() },
    });
  }

  private async _onPaymentFailed(invoice: Stripe.Invoice) {
    const subId = (invoice as any).subscription as string | null;
    if (!subId) return;
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subId },
      data:  { status: 'PAST_DUE' },
    });
    this.logger.warn(`⚠️  Payment failed for subscription ${subId}`);
  }

  private async _onInvoicePaid(invoice: Stripe.Invoice) {
    const subId = (invoice as any).subscription as string | null;
    if (!subId) return;

    const stripeSub = await this.stripe.subscriptions.retrieve(subId);
    const updated = await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subId },
      data:  {
        status:             'ACTIVE',
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
      },
    });

    if (updated.count === 0) return;

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subId },
      include: { user: true },
    });

    if (!subscription?.user?.email) return;

    await this.emailService.sendBillingConfirmationEmail({
      to: subscription.user.email,
      userName: subscription.user.name,
      farmName: subscription.user.farmName,
      planLabel: PLAN_LABELS[subscription.plan] ?? subscription.plan,
      billingInterval: subscription.billingInterval,
      amount: ((invoice.amount_paid ?? 0) / 100).toFixed(2),
      currency: invoice.currency ?? 'usd',
      invoiceNumber: invoice.number ?? null,
      invoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdf: invoice.invoice_pdf ?? null,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
      sessionId: invoice.id,
    });
  }

  // ─── Private: helpers ────────────────────────────────────────────────────

  private async _getOrCreateCustomer(
    userId: string,
    email: string,
    name: string,
  ): Promise<string> {
    // Check if we already have a customer ID stored
    const existing = await this.prisma.subscription.findUnique({ where: { userId } });
    if (existing?.stripeCustomerId) return existing.stripeCustomerId;

    // Create a new Stripe customer
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: { userId },
    });

    // Persist it immediately so we don't create duplicates on retry
    await this.prisma.subscription.upsert({
      where:  { userId },
      create: { userId, stripeCustomerId: customer.id },
      update: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  private _buildLineItems(dto: CreateCheckoutDto): Stripe.Checkout.SessionCreateParams.LineItem[] {
    const items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Base plan
    const planPrices = STRIPE_PRICES[dto.plan as keyof typeof STRIPE_PRICES];
    if (!planPrices || typeof planPrices !== 'object' || !('monthly' in planPrices)) {
      throw new BadRequestException(`Unknown plan: ${dto.plan}`);
    }
    const basePriceId = dto.annual
      ? (planPrices as { monthly: string; annual: string }).annual
      : (planPrices as { monthly: string; annual: string }).monthly;

    items.push({ price: basePriceId, quantity: 1 });

    // Robot add-ons — use annual prices if annual billing, monthly otherwise
    for (const robot of dto.robots ?? []) {
      const robotPrices = STRIPE_PRICES[robot.tier as keyof typeof STRIPE_PRICES];
      if (typeof robotPrices !== 'object' || !('monthly' in robotPrices)) continue;
      
      const robotPriceId = dto.annual
        ? (robotPrices as { monthly: string; annual: string }).annual
        : (robotPrices as { monthly: string; annual: string }).monthly;
      
      items.push({ price: robotPriceId, quantity: robot.quantity });
    }

    return items;
  }

  private _mapPlanFromMetadata(raw: string): any {
    const map: Record<string, string> = {
      essential:      'ESSENTIAL',
      growth:         'GROWTH',
      operations_pro: 'OPERATIONS_PRO',
      enterprise:     'ENTERPRISE',
    };
    return map[raw] ?? 'FREE';
  }

  private _mapStatus(stripeStatus: Stripe.Subscription.Status): any {
    const map: Record<string, string> = {
      trialing:          'TRIALING',
      active:            'ACTIVE',
      past_due:          'PAST_DUE',
      canceled:          'CANCELED',
      incomplete:        'INCOMPLETE',
      incomplete_expired:'CANCELED',
      unpaid:            'PAST_DUE',
      paused:            'PAUSED',
    };
    return map[stripeStatus] ?? 'INCOMPLETE';
  }

  private _extractRobotAddOns(stripeSub: Stripe.Subscription): any[] {
    const robotPriceIds = new Set<string>([
      STRIPE_PRICES.robot_connect.monthly,
      STRIPE_PRICES.robot_connect.annual,
      STRIPE_PRICES.robot_autonomy.monthly,
      STRIPE_PRICES.robot_autonomy.annual,
      STRIPE_PRICES.robot_fleet.monthly,
      STRIPE_PRICES.robot_fleet.annual,
    ]);

    return stripeSub.items.data
      .filter(item => robotPriceIds.has(item.price.id))
      .map(item => {
        // Find which robot tier this price ID belongs to
        let tier = 'unknown';
        if ([STRIPE_PRICES.robot_connect.monthly, STRIPE_PRICES.robot_connect.annual].includes(item.price.id as any)) {
          tier = 'robot_connect';
        } else if ([STRIPE_PRICES.robot_autonomy.monthly, STRIPE_PRICES.robot_autonomy.annual].includes(item.price.id as any)) {
          tier = 'robot_autonomy';
        } else if ([STRIPE_PRICES.robot_fleet.monthly, STRIPE_PRICES.robot_fleet.annual].includes(item.price.id as any)) {
          tier = 'robot_fleet';
        }
        
        return {
          priceId:  item.price.id,
          quantity: item.quantity ?? 1,
          tier,
        };
      });
  }
}
