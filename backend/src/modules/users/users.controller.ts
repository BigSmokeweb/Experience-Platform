import { Controller, Get, Put, Patch, Body, Query, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  UpdateTravelerProfileSchema,
  UpdateTravelerProfileDto,
} from '@experience-platform/shared';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  async searchUsers(
    @Query('q') query?: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.usersService.searchUsers(query, userId);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  /**
   * PATCH /users/me/traveler-profile (Canonical endpoint per build prompt)
   */
  @Patch('me/traveler-profile')
  @UsePipes(new ZodValidationPipe(UpdateTravelerProfileSchema))
  async patchTravelerProfile(
    @CurrentUser('id') userId: string,
    @Body() body: UpdateTravelerProfileDto,
  ) {
    return this.usersService.updateProfile(userId, body);
  }

  @Put('me/profile')
  @UsePipes(new ZodValidationPipe(UpdateTravelerProfileSchema))
  async updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() body: UpdateTravelerProfileDto,
  ) {
    return this.usersService.updateProfile(userId, body);
  }
}
