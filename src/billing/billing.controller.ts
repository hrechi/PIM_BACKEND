import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Header,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ── POST /api/billing/checkout ──────────────────────────────────────────
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a Stripe Checkout session' })
  async createCheckout(
    @Req() req: any,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.billingService.createCheckoutSession(req.user.id, dto);
  }

  // ── POST /api/billing/portal ────────────────────────────────────────────
  @Post('portal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Open Stripe Customer Portal (manage / cancel)' })
  async openPortal(
    @Req() req: any,
    @Body('returnUrl') returnUrl?: string,
  ) {
    return this.billingService.createPortalSession(req.user.id, returnUrl);
  }

  // ── GET /api/billing/subscription ──────────────────────────────────────
  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current subscription status' })
  async getSubscription(@Req() req: any) {
    return this.billingService.getSubscription(req.user.id);
  }

  // ── GET /api/billing/success ────────────────────────────────────────────
  @Get('success')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Stripe success page' })
  async paymentSuccess(@Req() req: any) {
    const sessionId = req.query?.session_id?.toString();
    return this.billingService.getSuccessPage(sessionId);
  }

  // ── GET /api/billing/cancel ─────────────────────────────────────────────
  @Get('cancel')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Stripe cancel page' })
  async paymentCancel() {
    return this.billingService.getCancelPage();
  }

  // ── POST /api/billing/webhook ───────────────────────────────────────────
  // Raw body is required for Stripe signature verification.
  // NestJS raw body is enabled via { rawBody: true } in main.ts.
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint (do not call manually)' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      return { received: false, error: 'No raw body' };
    }
    return this.billingService.handleWebhook(rawBody, signature);
  }
}
