import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  Role,
  RegisterTravelerDto,
  RegisterProviderDto,
  RegisterUserDto,
  LoginDto,
  AuthTokensResponse,
} from '@experience-platform/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Unified Register (Traveler or Provider) - Option A Auto-login
   * Ensures homeCity, businessName, phone etc. are properly persisted.
   */
  async register(dto: RegisterUserDto): Promise<AuthTokensResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await argon2.hash(dto.password);
    const role = dto.role || Role.TRAVELER;
    const name = dto.name || (role === Role.PROVIDER ? 'Host' : 'Traveler');

    if (role === Role.PROVIDER) {
      const mfaSecret = authenticator.generateSecret();
      const user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          role: Role.PROVIDER,
          name,
          mfaEnabled: false, // Default to standard auth for hackathon register flow
          mfaSecret,
          providerProfile: {
            create: {
              businessName: dto.businessName || `${name}'s Experiences`,
              businessType: dto.businessType || 'Local Host',
              phone: dto.phone || 'Unspecified',
              city: dto.city || dto.homeCity || 'Mumbai',
            },
          },
        },
        include: {
          providerProfile: true,
        },
      });
      return this.generateAuthTokens(user);
    } else {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          role: Role.TRAVELER,
          name,
          travelerProfile: {
            create: {
              homeCity: dto.homeCity || null,
            },
          },
        },
        include: {
          travelerProfile: true,
        },
      });
      return this.generateAuthTokens(user);
    }
  }

  /**
   * Register Traveler (Legacy endpoint)
   */
  async registerTraveler(dto: RegisterTravelerDto): Promise<AuthTokensResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email address is already registered');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: Role.TRAVELER,
        name: dto.name,
        travelerProfile: {
          create: {
            homeCity: dto.homeCity,
            interests: dto.interests,
            budgetBand: dto.budgetBand,
            travelStyle: dto.travelStyle,
          },
        },
      },
      include: {
        travelerProfile: true,
      },
    });

    return this.generateAuthTokens(user);
  }

  /**
   * Register Provider
   */
  async registerProvider(dto: RegisterProviderDto): Promise<AuthTokensResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email address is already registered');
    }

    const passwordHash = await argon2.hash(dto.password);
    // Providers get MFA secret generated upon registration (mandatory)
    const mfaSecret = authenticator.generateSecret();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: Role.PROVIDER,
        name: dto.name,
        mfaEnabled: true,
        mfaSecret,
        providerProfile: {
          create: {
            businessName: dto.businessName,
            businessType: dto.businessType,
            phone: dto.phone,
            city: dto.city,
          },
        },
      },
      include: {
        providerProfile: true,
      },
    });

    return this.generateAuthTokens(user);
  }

  /**
   * Login (Traveler & Provider)
   */
  async login(dto: LoginDto): Promise<AuthTokensResponse & { requiresMfaSetup?: boolean; qrCodeDataUrl?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { providerProfile: true, travelerProfile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const validPassword = await argon2.verify(user.passwordHash, dto.password);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Role Enforcement: Ensure Travelers cannot log in as Providers and vice versa
    if (dto.role && user.role !== dto.role && user.role !== Role.ADMIN) {
      if (dto.role === Role.PROVIDER) {
        throw new UnauthorizedException('This account is registered as a Traveler. Please switch to the Traveler tab to sign in.');
      } else {
        throw new UnauthorizedException('This account is registered as a Host Guild provider. Please switch to the Host Guild tab to sign in.');
      }
    }

    // Enforce MFA for accounts with MFA enabled
    if (user.mfaEnabled) {
      if (!dto.mfaCode) {
        // If MFA code missing, throw 403 specifying MFA requirement
        throw new ForbiddenException({
          message: 'MFA code is required for this account',
          requiresMfa: true,
        });
      }

      if (!user.mfaSecret) {
        throw new UnauthorizedException('MFA not configured properly');
      }

      const isValidMfa = authenticator.verify({
        token: dto.mfaCode,
        secret: user.mfaSecret,
      });

      if (!isValidMfa) {
        throw new UnauthorizedException('Invalid 6-digit MFA code');
      }
    }

    return this.generateAuthTokens(user);
  }

  /**
   * Setup / retrieve QR Code for Provider MFA
   */
  async generateMfaQrCode(userId: string): Promise<{ secret: string; qrCodeDataUrl: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    let secret = user.mfaSecret;
    if (!secret) {
      secret = authenticator.generateSecret();
      await this.prisma.user.update({
        where: { id: userId },
        data: { mfaSecret: secret },
      });
    }

    const otpauthUrl = authenticator.keyuri(user.email, 'LocalExperiencePlatform', secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    return { secret, qrCodeDataUrl };
  }

  /**
   * Refresh Token Rotation
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokensResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { providerProfile: true, travelerProfile: true },
      });

      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Access denied');
      }

      const isTokenMatch = await argon2.verify(user.refreshTokenHash, refreshToken);
      if (!isTokenMatch) {
        // Token reuse / compromise detected -> revoke all sessions
        await this.prisma.user.update({
          where: { id: user.id },
          data: { refreshTokenHash: null },
        });
        throw new UnauthorizedException('Token rotation violation detected');
      }

      return this.generateAuthTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Helper: Generate Access (15m) + Refresh (7d) tokens with hash rotation
   */
  private async generateAuthTokens(user: any): Promise<AuthTokensResponse> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET') || 'default-access-secret',
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'default-refresh-secret',
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
    });

    const refreshTokenHash = await argon2.hash(refreshToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 mins in seconds
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        mfaEnabled: user.mfaEnabled,
        verificationStatus: user.providerProfile?.verificationStatus,
      },
    };
  }
}
