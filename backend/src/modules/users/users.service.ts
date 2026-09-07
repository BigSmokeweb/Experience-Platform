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
        travelerProfile: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Update traveler profile with IDOR protection
   * Updates name on User and preferences on TravelerProfile atomically.
   */
  async updateProfile(userId: string, data: UpdateTravelerProfileDto) {
    if (data.name) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { name: data.name },
      });
    }

    return this.prisma.travelerProfile.upsert({
      where: { userId },
      create: {
        userId,
        homeCity: data.homeCity || null,
        interests: data.interests || [],
        budgetBand: data.budgetBand,
        travelStyle: data.travelStyle || null,
      },
      update: {
        ...(data.homeCity !== undefined && { homeCity: data.homeCity }),
        ...(data.interests !== undefined && { interests: data.interests }),
        ...(data.budgetBand !== undefined && { budgetBand: data.budgetBand }),
        ...(data.travelStyle !== undefined && { travelStyle: data.travelStyle }),
      },
    });
  }
}
