import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthUser } from '../auth/types/auth-user';
import { MembershipsService } from './memberships.service';
import { CreateMembershipDto, RenewMembershipDto } from './dto/memberships.dto';

@ApiTags('memberships')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.MEMBERSHIPS_RENEW)
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Get()
  list(@GymId() gymId: string, @Query('memberId') memberId?: string) {
    return this.memberships.list(gymId, memberId);
  }

  @Post()
  assign(@GymId() gymId: string, @Body() dto: CreateMembershipDto, @CurrentUser() user: AuthUser) {
    return this.memberships.assign(gymId, dto, user.sub);
  }

  @Post(':id/renew')
  renew(@GymId() gymId: string, @Param('id') id: string, @Body() dto: RenewMembershipDto) {
    return this.memberships.renew(gymId, id, dto);
  }

  @Post(':id/freeze')
  freeze(@GymId() gymId: string, @Param('id') id: string) {
    return this.memberships.freeze(gymId, id);
  }

  @Post(':id/cancel')
  cancel(@GymId() gymId: string, @Param('id') id: string) {
    return this.memberships.cancel(gymId, id);
  }
}
