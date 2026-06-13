import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    // Feature modules (auth, gyms, members, plans, memberships, payments,
    // attendance, …) are added here as they are built — see PRODUCT_PLAN.md §12.
  ],
})
export class AppModule {}
