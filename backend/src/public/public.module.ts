import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { ClassesModule } from '../classes/classes.module';
import { LeadsModule } from '../leads/leads.module';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [ClassesModule, LeadsModule, AttendanceModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
