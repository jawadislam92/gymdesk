import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { MembersModule } from './members/members.module';
import { PlansModule } from './plans/plans.module';
import { MembershipsModule } from './memberships/memberships.module';
import { PaymentsModule } from './payments/payments.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GymsModule } from './gyms/gyms.module';
import { UsersModule } from './users/users.module';
import { ReportsModule } from './reports/reports.module';
import { TrainersModule } from './trainers/trainers.module';
import { ClassesModule } from './classes/classes.module';
import { MeModule } from './me/me.module';
import { PlatformModule } from './platform/platform.module';
import { LeadsModule } from './leads/leads.module';
import { PublicModule } from './public/public.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    HealthModule,
    MembersModule,
    PlansModule,
    MembershipsModule,
    PaymentsModule,
    AttendanceModule,
    DashboardModule,
    GymsModule,
    UsersModule,
    ReportsModule,
    TrainersModule,
    ClassesModule,
    MeModule,
    PlatformModule,
    LeadsModule,
    PublicModule,
  ],
})
export class AppModule {}
