import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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
}
