import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { CreateTripMemoryDto, UpdateTripMemoryDto } from '@experience-platform/shared';

@Injectable()
export class TripMemoriesService {
  private readonly logger = new Logger(TripMemoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Create or return existing TripMemory for a session
   */
  async createMemory(userId: string, dto: CreateTripMemoryDto) {
    let validSessionId: string | null = null;

    if (dto.tripSessionId) {
      const session = await this.prisma.tripSession.findUnique({
        where: { id: dto.tripSessionId },
      });
      if (session && session.userId === userId) {
        validSessionId = dto.tripSessionId;
        const existing = await this.prisma.tripMemory.findUnique({
          where: { tripSessionId: validSessionId },
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
        });
        if (existing) {
          return existing;
        }
      }
    }

    return this.prisma.tripMemory.create({
      data: {
        userId,
        tripSessionId: validSessionId,
        title: dto.title,
        notes: dto.notes || null,
        visitedAt: dto.visitedAt ? new Date(dto.visitedAt) : null,
      },
      include: {
        photos: true,
        tripSession: true,
      },
    });
  }

  /**
   * Get all trip memories for user sorted newest-first
   */
  async getUserMemories(userId: string) {
    return this.prisma.tripMemory.findMany({
      where: { userId },
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
    });
  }

  /**
   * Get single memory by ID
   */
  async getMemoryById(userId: string, id: string) {
    const memory = await this.prisma.tripMemory.findUnique({
      where: { id },
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
    });

    if (!memory) {
      throw new NotFoundException(`Trip memory ${id} not found`);
    }

    if (memory.userId !== userId) {
      throw new ForbiddenException('Access denied to this trip memory');
    }

    return memory;
  }

  /**
   * Get single memory by TripSession ID
   */
  async getMemoryBySessionId(userId: string, tripSessionId: string) {
    const memory = await this.prisma.tripMemory.findUnique({
      where: { tripSessionId },
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
    });

    if (!memory) {
      return null;
    }

    if (memory.userId !== userId) {
      throw new ForbiddenException('Access denied to this trip memory');
    }

    return memory;
  }

  /**
   * Update memory title/notes/visitedAt
   */
  async updateMemory(userId: string, id: string, dto: UpdateTripMemoryDto) {
    await this.getMemoryById(userId, id);

    return this.prisma.tripMemory.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.visitedAt && { visitedAt: new Date(dto.visitedAt) }),
      },
      include: {
        photos: true,
        tripSession: true,
      },
    });
  }

  /**
   * Upload and attach a photo to the memory
   */
  async addPhoto(
    userId: string,
    memoryId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    experienceId?: string,
    caption?: string,
    takenAt?: string,
  ) {
    const memory = await this.getMemoryById(userId, memoryId);

    // Limit check (max 50 photos per memory)
    if (memory.photos.length >= 50) {
      throw new BadRequestException('Maximum 50 photos allowed per trip memory');
    }

    // If experienceId provided, verify experience exists (silently null if invalid)
    let validExpId: string | null = null;
    if (experienceId) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(experienceId);
        if (isUuid) {
          const exp = await this.prisma.experience.findUnique({
            where: { id: experienceId },
          });
          if (exp) {
            validExpId = exp.id;
          }
        }
      } catch (err) {
        this.logger.warn(`experienceId validation failed for "${experienceId}": ${err}`);
        // Silently continue with null experienceId
      }
    }

    try {
      const { publicUrl, storageKey } = await this.storageService.uploadPhoto(
        file.buffer,
        file.mimetype,
        file.originalname,
        `memories/${memoryId}`,
      );

      // Guard: reject oversized base64 data URIs that would bloat the DB
      if (publicUrl.startsWith('data:') && publicUrl.length > 500_000) {
        throw new BadRequestException(
          'Photo upload to cloud storage failed and the image is too large for fallback storage. Please try a smaller image or try again later.',
        );
      }

      return await this.prisma.tripMemoryPhoto.create({
        data: {
          tripMemoryId: memoryId,
          experienceId: validExpId,
          url: publicUrl,
          storageKey,
          caption: caption || null,
          takenAt: takenAt ? new Date(takenAt) : new Date(),
        },
        include: {
          experience: {
            select: { id: true, title: true, address: true, city: true },
          },
        },
      });
    } catch (err) {
      this.logger.error(`addPhoto failed for memory ${memoryId}: ${err?.message || err}`);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        `Failed to save photo: ${err?.message || 'Unknown storage error'}`,
      );
    }
  }

  /**
   * Delete single photo
   */
  async deletePhoto(userId: string, memoryId: string, photoId: string) {
    await this.getMemoryById(userId, memoryId);

    const photo = await this.prisma.tripMemoryPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo || photo.tripMemoryId !== memoryId) {
      throw new NotFoundException(`Photo ${photoId} not found in this memory`);
    }

    if (photo.storageKey) {
      await this.storageService.deletePhoto(photo.storageKey);
    }

    await this.prisma.tripMemoryPhoto.delete({
      where: { id: photoId },
    });

    return { success: true };
  }

  /**
   * Delete entire trip memory
   */
  async deleteMemory(userId: string, id: string) {
    const memory = await this.getMemoryById(userId, id);

    // Delete photos from storage
    for (const photo of memory.photos) {
      if (photo.storageKey) {
        await this.storageService.deletePhoto(photo.storageKey);
      }
    }

    await this.prisma.tripMemory.delete({
      where: { id },
    });

    return { success: true };
  }
}
