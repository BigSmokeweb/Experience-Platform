import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health.controller';

import { PrismaModule } from './common/prisma/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { ExperiencesModule } from './modules/experiences/experiences.module';
import { RecommendationEngineModule } from './modules/recommendation-engine/recommendation-engine.module';
import { AiReasoningModule } from './modules/ai-reasoning/ai-reasoning.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AdminModule } from './modules/admin/admin.module';
import { TripSessionModule } from './modules/trip-session/trip-session.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => [
        {
          ttl: Number(config.get('RATE_LIMIT_GLOBAL_TTL', 60000)),
          limit: Number(config.get('RATE_LIMIT_GLOBAL_LIMIT', 100)),
        },
      ],
      inject: [ConfigService],
    }),
    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    ProvidersModule,
    ExperiencesModule,
    RecommendationEngineModule,
    AiReasoningModule,
    ReviewsModule,
    AdminModule,
    TripSessionModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
