import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async signUp(dto: SignUpDto) {
    // Ensure at least email or phone is provided
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Either email or phone must be provided');
    }

    // Check if user already exists
    if (dto.email) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingByEmail) {
        throw new ConflictException('Email already in use');
      }
    }

    if (dto.phone) {
      const existingByPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingByPhone) {
        throw new ConflictException('Phone number already in use');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        farmName: dto.farmName,
        email: dto.email || null,
        phone: dto.phone || null,
        password: hashedPassword,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    // Store hashed refresh token
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async signIn(dto: SignInDto) {
    // Find user by email or phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { phone: dto.identifier }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    // Store hashed refresh token
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshTokens(userId: string, currentRefreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    // Verify refresh token matches stored hash
    const tokenMatches = await bcrypt.compare(
      currentRefreshToken,
      user.refreshToken,
    );
    if (!tokenMatches) {
      throw new UnauthorizedException('Access denied');
    }

    // Generate new tokens (rotation)
    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async signOut(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  // ─── Forgot Password ─────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('No account found with this email');
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otp: hashedOtp, otpExpiresAt },
    });

    // Send email
    await this.emailService.sendOtpEmail(dto.email, otp, user.name);

    return { message: 'OTP sent to your email' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.otp || !user.otpExpiresAt) {
      throw new BadRequestException('No OTP request found for this email');
    }

    // Check expiry
    if (new Date() > user.otpExpiresAt) {
      // Clear expired OTP
      await this.prisma.user.update({
        where: { id: user.id },
        data: { otp: null, otpExpiresAt: null },
      });
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // Verify OTP
    const otpValid = await bcrypt.compare(dto.otp, user.otp);
    if (!otpValid) {
      throw new BadRequestException('Invalid OTP');
    }

    return { message: 'OTP verified successfully' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.otp || !user.otpExpiresAt) {
      throw new BadRequestException('No OTP request found for this email');
    }

    // Check expiry
    if (new Date() > user.otpExpiresAt) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { otp: null, otpExpiresAt: null },
      });
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // Verify OTP
    const otpValid = await bcrypt.compare(dto.otp, user.otp);
    if (!otpValid) {
      throw new BadRequestException('Invalid OTP');
    }

    // Update password & clear OTP
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        otp: null,
        otpExpiresAt: null,
      },
    });

    return { message: 'Password reset successfully' };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private async generateTokens(userId: string, email?: string | null) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedToken },
    });
  }

  private sanitizeUser(user: any) {
    const { password, refreshToken, ...sanitized } = user;
    return sanitized;
  }
}
