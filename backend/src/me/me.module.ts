import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { ClassesModule } from '../classes/classes.module';
import { WorkoutsModule } from '../workouts/workouts.module';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [ClassesModule, WorkoutsModule, ProgressModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
