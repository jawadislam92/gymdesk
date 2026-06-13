import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness/readiness probe (also reports DB connectivity).' })
  async check(): Promise<{
    status: 'ok';
    service: string;
    timestamp: string;
    database: 'up' | 'down';
  }> {
    return {
      status: 'ok',
      service: 'gymflow-api',
      timestamp: new Date().toISOString(),
      database: await this.pingDatabase(),
    };
  }

  /** Probe the DB but never let the health endpoint hang waiting on it. */
  private async pingDatabase(timeoutMs = 1000): Promise<'up' | 'down'> {
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('db ping timeout')), timeoutMs),
        ),
      ]);
      return 'up';
    } catch {
      return 'down';
    }
  }
}
