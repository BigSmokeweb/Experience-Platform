import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { TripMemoriesService } from './trip-memories.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CreateTripMemorySchema,
  CreateTripMemoryDto,
  UpdateTripMemorySchema,
  UpdateTripMemoryDto,
} from '@experience-platform/shared';

@UseGuards(AuthGuard('jwt'))
@Controller('trip-memories')
export class TripMemoriesController {
  constructor(private readonly tripMemoriesService: TripMemoriesService) {}

  /**
   * POST /trip-memories
   * Create or return existing TripMemory for a trip
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createMemory(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateTripMemorySchema)) dto: CreateTripMemoryDto,
  ) {
    return this.tripMemoriesService.createMemory(user.id, dto);
  }

  /**
   * GET /trip-memories
   * Get all trip memories for logged-in user
   */
  @Get()
  getUserMemories(@CurrentUser() user: { id: string }) {
    return this.tripMemoriesService.getUserMemories(user.id);
  }

  /**
   * GET /trip-memories/session/:sessionId
   * Find trip memory by session ID
   */
  @Get('session/:sessionId')
  getMemoryBySessionId(
    @CurrentUser() user: { id: string },
    @Param('sessionId') sessionId: string,
  ) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId);
    if (!isUuid) return null;
    return this.tripMemoriesService.getMemoryBySessionId(user.id, sessionId);
  }

  /**
   * GET /trip-memories/:id
   * Get memory by ID with all photos
   */
  @Get(':id')
  getMemoryById(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) return null;
    return this.tripMemoriesService.getMemoryById(user.id, id);
  }

  /**
   * PATCH /trip-memories/:id
   * Update title or notes
   */
  @Patch(':id')
  updateMemory(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateTripMemorySchema)) dto: UpdateTripMemoryDto,
  ) {
    return this.tripMemoriesService.updateMemory(user.id, id, dto);
  }

  /**
   * POST /trip-memories/:id/photos
   * Upload a photo for this memory
   */
  @Post(':id/photos')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
      fileFilter: (_req, file, cb) => {
        const isImageMime =
          !file.mimetype ||
          file.mimetype.startsWith('image/') ||
          /application\/(octet-stream)/i.test(file.mimetype);
        const isImageExt = /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(file.originalname || '');
        if (isImageMime || isImageExt) {
          return cb(null, true);
        }
        return cb(
          new BadRequestException('Only image files (jpg, jpeg, png, webp, gif) are allowed'),
          false,
        );
      },
    }),
  )
  uploadPhoto(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string },
    @Body('experienceId') experienceId?: string,
    @Body('caption') caption?: string,
    @Body('takenAt') takenAt?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    return this.tripMemoriesService.addPhoto(
      user.id,
      id,
      file,
      experienceId,
      caption,
      takenAt,
    );
  }

  /**
   * DELETE /trip-memories/:id/photos/:photoId
   * Delete a specific photo
   */
  @Delete(':id/photos/:photoId')
  deletePhoto(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    return this.tripMemoriesService.deletePhoto(user.id, id, photoId);
  }

  /**
   * DELETE /trip-memories/:id
   * Delete memory and all its photos
   */
  @Delete(':id')
  deleteMemory(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tripMemoriesService.deleteMemory(user.id, id);
  }
}
