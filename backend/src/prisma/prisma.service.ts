import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Wraps the generated Prisma client as an injectable Nest provider.
 *
 * Connecting is best-effort at startup so the API can still boot (in a degraded
 * state) before a database has been provisioned — handy during early scaffolding.
 * Once DATABASE_URL points at a real Postgres, this connects normally.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Connected to the database');
    } catch (err) {
      this.logger.warn(
        `Could not connect to the database at startup — running in degraded mode. ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
