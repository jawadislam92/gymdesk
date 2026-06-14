import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthUser } from '../auth/types/auth-user';
import { MeService } from './me.service';
import { CreateProgressDto } from '../progress/dto/progress.dto';

// Member self-service. SELF_VIEW is held only by the `member` role, so these
// endpoints are member-only and always scoped to the caller's own data.
@ApiTags('me')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.SELF_VIEW)
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get('summary')
  summary(@GymId() gymId: string, @CurrentUser() u: AuthUser) {
    return this.me.summary(gymId, u.sub);
  }

  @Get('payments')
  payments(@GymId() gymId: string, @CurrentUser() u: AuthUser) {
    return this.me.payments(gymId, u.sub);
  }

  @Get('attendance')
  attendance(@GymId() gymId: string, @CurrentUser() u: AuthUser) {
    return this.me.attendance(gymId, u.sub);
  }

  @Get('bookings')
  bookings(@GymId() gymId: string, @CurrentUser() u: AuthUser) {
    return this.me.myBookings(gymId, u.sub);
  }

  @Get('classes')
  classes(@GymId() gymId: string) {
    return this.me.availableClasses(gymId);
  }

  @Post('classes/:id/book')
  book(@GymId() gymId: string, @Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.me.bookClass(gymId, u.sub, id);
  }

  @Delete('bookings/:id')
  cancel(@GymId() gymId: string, @Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.me.cancelMyBooking(gymId, u.sub, id);
  }

  @Get('workouts')
  workouts(@GymId() gymId: string, @CurrentUser() u: AuthUser) {
    return this.me.myWorkouts(gymId, u.sub);
  }

  @Get('progress')
  progress(@GymId() gymId: string, @CurrentUser() u: AuthUser) {
    return this.me.myProgress(gymId, u.sub);
  }

  @Get('diet')
  diet(@GymId() gymId: string, @CurrentUser() u: AuthUser) {
    return this.me.myDiet(gymId, u.sub);
  }

  @Post('progress')
  logProgress(@GymId() gymId: string, @Body() dto: CreateProgressDto, @CurrentUser() u: AuthUser) {
    return this.me.logProgress(gymId, u.sub, dto);
  }
}
