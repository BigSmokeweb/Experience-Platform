import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('Connected to PostgreSQL successfully via Prisma.');
        break;
      } catch (err: any) {
        retries--;
        this.logger.warn(`Prisma connection attempt failed (${retries} retries left): ${err?.message}`);
        if (retries === 0) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

