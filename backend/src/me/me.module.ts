import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { ClassesModule } from '../classes/classes.module';
import { WorkoutsModule } from '../workouts/workouts.module';
import { ProgressModule } from '../progress/progress.module';
import { DietModule } from '../diet/diet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WaiversModule } from '../waivers/waivers.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [
    ClassesModule,
    WorkoutsModule,
    ProgressModule,
    DietModule,
    NotificationsModule,
    WaiversModule,
    LoyaltyModule,
  ],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
