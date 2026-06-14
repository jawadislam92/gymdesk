import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { ClassesModule } from '../classes/classes.module';
import { WorkoutsModule } from '../workouts/workouts.module';
import { ProgressModule } from '../progress/progress.module';
import { DietModule } from '../diet/diet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ClassesModule, WorkoutsModule, ProgressModule, DietModule, NotificationsModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
