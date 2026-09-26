import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateTravelerProfileDto } from '@experience-platform/shared';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get traveler profile with IDOR check
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        travelerProfile: true,
        tripMemories: {
          include: {
            photos: {
              include: {
                experience: {
                  select: { id: true, title: true, address: true, city: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
            tripSession: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        tripMemoriesData: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Update user avatar directly in database
   */
  async updateAvatar(userId: string, avatarUrl: string | null) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });
    return user;
  }

  /**
   * Update traveler profile with IDOR protection
   * Updates name and avatarUrl on User and preferences on TravelerProfile atomically.
   */
  async updateProfile(userId: string, data: UpdateTravelerProfileDto) {
    if (data.name !== undefined || data.avatarUrl !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        },
      });
    }

    return this.prisma.travelerProfile.upsert({
      where: { userId },
      create: {
        userId,
        homeCity: data.homeCity || null,
        interests: data.interests || [],
        budgetBand: data.budgetBand ?? undefined,
        travelStyle: data.travelStyle || null,
      },
      update: {
        ...(data.homeCity !== undefined && { homeCity: data.homeCity }),
        ...(data.interests !== undefined && { interests: data.interests }),
        ...(data.budgetBand != null && { budgetBand: data.budgetBand }),
        ...(data.travelStyle !== undefined && { travelStyle: data.travelStyle }),
      },
    });
  }

  /**
   * Search registered users by name or email (excluding current user)
   */
  async searchUsers(query?: string, currentUserId?: string) {
    const q = (query || '').trim();

    const where: any = {};
    if (currentUserId) {
      where.id = { not: currentUserId };
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        travelerProfile: {
          select: {
            homeCity: true,
          },
        },
      },
      take: 12,
    });
  }
}

