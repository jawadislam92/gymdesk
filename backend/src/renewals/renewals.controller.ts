import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { RenewalsService } from './renewals.service';
import { SetAutoRenewDto } from './renewals.dto';

@ApiTags('renewals')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.MEMBERSHIPS_RENEW)
@Controller('renewals')
export class RenewalsController {
  constructor(private readonly renewals: RenewalsService) {}

  @Get()
  expiring(@GymId() gymId: string, @Query('days') days?: string) {
    return this.renewals.expiring(gymId, days ? Number(days) : 14);
  }

  @Post('run')
  run(@GymId() gymId: string) {
    return this.renewals.autoRenew(gymId);
  }

  @Post(':membershipId/remind')
  remind(@GymId() gymId: string, @Param('membershipId') membershipId: string) {
    return this.renewals.remind(gymId, membershipId);
  }

  @Patch(':membershipId/auto-renew')
  setAutoRenew(
    @GymId() gymId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: SetAutoRenewDto,
  ) {
    return this.renewals.setAutoRenew(gymId, membershipId, dto.enabled);
  }
}
