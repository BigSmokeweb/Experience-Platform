import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './common/prisma/prisma.service';
import * as argon2 from 'argon2';

// Skip the global rate-limiter so Render health-check pings never get throttled
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('diag')
  async diag() {
    const report: any = {};
    try {
      const u = await this.prisma.user.findFirst({
        select: { id: true, email: true, name: true, role: true, avatarUrl: true, tripMemoriesData: true },
      });
      report.dbUser = { ok: true, user: u };
    } catch (e: any) {
      report.dbUser = { ok: false, error: e?.message };
    }

    try {
      const hash = await argon2.hash('123456');
      const verify = await argon2.verify(hash, '123456');
      report.argon2 = { ok: true, verify };
    } catch (e: any) {
      report.argon2 = { ok: false, error: e?.message };
    }

    return report;
  }
}
