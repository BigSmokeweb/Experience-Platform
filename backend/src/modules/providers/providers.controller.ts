import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProvidersService } from './providers.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  Role,
  RequestKycUploadUrlSchema,
  RequestKycUploadUrlDto,
  SubmitKycVerificationSchema,
  SubmitKycVerificationDto,
  UpdateProviderProfileSchema,
  UpdateProviderProfileDto,
} from '@experience-platform/shared';

@Controller('providers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.PROVIDER, Role.ADMIN)
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get('me')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.providersService.getProfile(userId);
  }

  @Patch('me')
  @UsePipes(new ZodValidationPipe(UpdateProviderProfileSchema))
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProviderProfileDto,
  ) {
    return this.providersService.updateProfile(userId, dto);
  }

  @Post('kyc/upload-url')
  @UsePipes(new ZodValidationPipe(RequestKycUploadUrlSchema))
  async getKycUploadSignedUrl(
    @CurrentUser('id') userId: string,
    @Body() dto: RequestKycUploadUrlDto,
  ) {
    return this.providersService.getKycUploadSignedUrl(userId, dto);
  }

  @Post('kyc/submit')
  @UsePipes(new ZodValidationPipe(SubmitKycVerificationSchema))
  async submitKyc(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitKycVerificationDto,
  ) {
    return this.providersService.submitKycVerification(userId, dto);
  }

  @Get('analytics')
  async getAnalytics(@CurrentUser('id') userId: string) {
    return this.providersService.getAnalytics(userId);
  }
}
