import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type BillingConfirmationEmailInput = {
  to: string;
  userName: string;
  farmName: string;
  planLabel: string;
  billingInterval: string;
  amount: string;
  currency: string;
  invoiceNumber?: string | null;
  invoiceUrl?: string | null;
  invoicePdf?: string | null;
  paidAt?: Date | null;
  sessionId?: string | null;
};

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  async sendOtpEmail(to: string, otp: string, userName: string): Promise<void> {
    const mailOptions = {
      from: `"Fieldly Team" <${this.configService.get<string>('EMAIL_USER')}>`,
      to,
      subject: 'Fieldly — Password Reset Code',
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 520px; margin: 0 auto; background-color: #FAF7F2; padding: 40px 32px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #2C3E2D; font-size: 28px; margin: 0;">Fieldly</h1>
            <p style="color: #7F8C8D; font-size: 14px; margin: 4px 0 0;">Smart Agriculture</p>
          </div>

          <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; text-align: center;">
            <h2 style="color: #2C3E2D; font-size: 20px; font-weight: 600; margin: 0 0 8px;">
              Password Reset Request
            </h2>
            <p style="color: #7F8C8D; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
              Hi <strong style="color: #2C3E2D;">${userName}</strong>, we received a request to reset your password. Use the code below to proceed:
            </p>

            <div style="background: linear-gradient(135deg, #2ECC71, #3498DB); border-radius: 12px; padding: 20px; margin: 0 0 24px;">
              <span style="font-size: 36px; font-weight: 700; color: #ffffff; letter-spacing: 12px;">${otp}</span>
            </div>

            <p style="color: #7F8C8D; font-size: 13px; margin: 0 0 4px;">
              This code will expire in <strong style="color: #2C3E2D;">3 minutes</strong>.
            </p>
            <p style="color: #7F8C8D; font-size: 13px; margin: 0;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <p style="color: #7F8C8D; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Fieldly Team &bull; Smart Agriculture
            </p>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendBillingConfirmationEmail(input: BillingConfirmationEmailInput): Promise<void> {
    const paidAtText = input.paidAt ? input.paidAt.toLocaleString() : new Date().toLocaleString();
    const invoiceLinks = [
      input.invoiceUrl ? `<a href="${input.invoiceUrl}" style="color:#1a7f37;">View Stripe invoice</a>` : '',
      input.invoicePdf ? `<a href="${input.invoicePdf}" style="color:#1a7f37;">Download PDF invoice</a>` : '',
    ].filter(Boolean).join(' &nbsp;|&nbsp; ');

    const mailOptions = {
      from: `"Fieldly Billing" <${this.configService.get<string>('EMAIL_USER')}>`,
      to: input.to,
      subject: `Fieldly payment confirmed${input.invoiceNumber ? ` - Invoice ${input.invoiceNumber}` : ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; background:#f7faf7; padding: 32px; border-radius: 18px; color:#16331f;">
          <div style="background:#fff; border-radius: 16px; padding: 28px; box-shadow: 0 8px 28px rgba(0,0,0,.08);">
            <div style="display:inline-block; padding:8px 12px; border-radius:999px; background:#e9f8ee; color:#1a7f37; font-weight:700; margin-bottom:16px;">
              Payment confirmed
            </div>
            <h1 style="margin:0 0 12px; font-size:28px;">Thank you, ${input.userName}.</h1>
            <p style="margin:0 0 18px; color:#4a5a4f; line-height:1.6;">
              We received your payment for <strong>${input.farmName}</strong>.
              Your subscription is now active.
            </p>
            <div style="background:#f4fbf6; border:1px solid #d8f0df; border-radius:14px; padding:18px; margin-bottom:18px;">
              <p style="margin:0 0 6px;"><strong>Plan:</strong> ${input.planLabel}</p>
              <p style="margin:0 0 6px;"><strong>Billing:</strong> ${input.billingInterval}</p>
              <p style="margin:0 0 6px;"><strong>Amount paid:</strong> ${input.amount} ${input.currency.toUpperCase()}</p>
              ${input.invoiceNumber ? `<p style="margin:0 0 6px;"><strong>Invoice:</strong> ${input.invoiceNumber}</p>` : ''}
              ${input.sessionId ? `<p style="margin:0;"><strong>Session:</strong> ${input.sessionId}</p>` : ''}
            </div>
            ${invoiceLinks ? `<p style="margin:0 0 18px;">${invoiceLinks}</p>` : ''}
            <p style="margin:0; color:#6b7b70; font-size:13px;">Payment date: ${paidAtText}</p>
          </div>
          <p style="text-align:center; color:#7f8c8d; font-size:12px; margin:16px 0 0;">© ${new Date().getFullYear()} Fieldly</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
