import {
  Controller,
  Post,
  Body,
  UsePipes,
  UseGuards,
  Get,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  RegisterTravelerSchema,
  RegisterTravelerDto,
  RegisterProviderSchema,
  RegisterProviderDto,
  RegisterUserSchema,
  RegisterUserDto,
  LoginSchema,
  LoginDto,
  RefreshTokenSchema,
  RefreshTokenDto,
} from '@experience-platform/shared';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @UsePipes(new ZodValidationPipe(RegisterUserSchema))
  async register(@Body() dto: RegisterUserDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Stricter 5 req/min rate limit on auth
  @Post('register/traveler')
  @UsePipes(new ZodValidationPipe(RegisterTravelerSchema))
  async registerTraveler(@Body() dto: RegisterTravelerDto) {
    return this.authService.registerTraveler(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register/provider')
  @UsePipes(new ZodValidationPipe(RegisterProviderSchema))
  async registerProvider(@Body() dto: RegisterProviderDto) {
    return this.authService.registerProvider(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  @UsePipes(new ZodValidationPipe(RefreshTokenSchema))
  async refreshTokens(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('mfa/qr-code')
  async getMfaQrCode(@CurrentUser('id') userId: string) {
    return this.authService.generateMfaQrCode(userId);
  }
}
