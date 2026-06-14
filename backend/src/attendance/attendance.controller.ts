import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthUser } from '../auth/types/auth-user';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/attendance.dto';

@ApiTags('attendance')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.ATTENDANCE_RECORD)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Post('check-in')
  checkIn(@GymId() gymId: string, @Body() dto: CheckInDto, @CurrentUser() user: AuthUser) {
    return this.attendance.checkIn(gymId, dto, user.sub);
  }

  @Get()
  list(
    @GymId() gymId: string,
    @Query('date') date?: string,
    @Query('memberId') memberId?: string,
  ) {
    return this.attendance.list(gymId, date, memberId);
  }

  @Get('summary')
  summary(@GymId() gymId: string) {
    return this.attendance.summary(gymId);
  }
}
