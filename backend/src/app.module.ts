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
import { WorkoutsModule } from './workouts/workouts.module';
import { ProgressModule } from './progress/progress.module';
import { DietModule } from './diet/diet.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WaiversModule } from './waivers/waivers.module';
import { RenewalsModule } from './renewals/renewals.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PosModule } from './pos/pos.module';
import { BillingModule } from './billing/billing.module';
import { AutomationsModule } from './automations/automations.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
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
    WorkoutsModule,
    ProgressModule,
    DietModule,
    NotificationsModule,
    WaiversModule,
    RenewalsModule,
    ExpensesModule,
    PosModule,
    BillingModule,
    AutomationsModule,
    LoyaltyModule,
    AiModule,
  ],
})
export class AppModule {}
