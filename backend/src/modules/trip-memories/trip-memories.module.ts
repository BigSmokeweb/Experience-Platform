import { Module } from '@nestjs/common';
import { TripMemoriesController } from './trip-memories.controller';
import { TripMemoriesService } from './trip-memories.service';

@Module({
  controllers: [TripMemoriesController],
  providers: [TripMemoriesService],
  exports: [TripMemoriesService],
})
export class TripMemoriesModule {}
