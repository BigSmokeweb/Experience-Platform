import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import {
  RequestKycUploadUrlDto,
  SubmitKycVerificationDto,
  VerificationStatus,
} from '@experience-platform/shared';

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Get provider profile with IDOR check
   */
  async getProfile(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        experiences: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Provider profile not found');
    }

    return profile;
  }

  /**
   * Update provider profile information
   */
  async updateProfile(userId: string, dto: any) {
    if (dto.name) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { name: dto.name },
      });
    }

    return this.prisma.providerProfile.update({
      where: { userId },
      data: {
        ...(dto.businessName !== undefined && { businessName: dto.businessName }),
        ...(dto.businessType !== undefined && { businessType: dto.businessType }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.city !== undefined && { city: dto.city }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  /**
   * Request short-lived single-use signed URL for KYC upload
   */
  async getKycUploadSignedUrl(userId: string, dto: RequestKycUploadUrlDto) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Provider profile not found');
    }

    return this.storageService.generateKycUploadSignedUrl(
      profile.id,
      dto.documentType,
      dto.fileName,
    );
  }

  /**
   * Submit KYC document for review
   */
  async submitKycVerification(userId: string, dto: SubmitKycVerificationDto) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Provider profile not found');
    }

    return this.prisma.providerProfile.update({
      where: { userId },
      data: {
        verificationStatus: VerificationStatus.PENDING_REVIEW,
        kycDocumentRef: dto.documentStorageKey,
        kycDocumentType: dto.documentType as any,
        kycSubmittedAt: new Date(),
        kycRejectionReason: null,
      },
    });
  }

  /**
   * Provider analytics
   */
  async getAnalytics(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
      include: {
        experiences: {
          select: { id: true, title: true, ratingAverage: true, reviewCount: true },
        },
      },
    });
    if (!profile) throw new NotFoundException();

    const experienceIds = profile.experiences.map((e) => e.id);

    const interactionCounts = await this.prisma.interaction.groupBy({
      by: ['eventType'],
      where: {
        experienceId: { in: experienceIds },
      },
      _count: {
        eventType: true,
      },
    });

    return {
      profile,
      experiencesCount: profile.experiences.length,
      interactionMetrics: interactionCounts,
    };
  }
}
