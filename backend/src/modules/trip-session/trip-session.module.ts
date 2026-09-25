import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TripSessionController } from './trip-session.controller';
import { TripSessionService } from './trip-session.service';
import { TripSessionCleanupService } from './trip-session.cleanup.service';
import { WeatherService } from './weather.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AiReasoningModule } from '../ai-reasoning/ai-reasoning.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    AiReasoningModule,
    NotificationsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [TripSessionController],
  providers: [TripSessionService, TripSessionCleanupService, WeatherService],
  exports: [TripSessionService],
})
export class TripSessionModule {}
