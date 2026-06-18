import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthUser } from '../auth/types/auth-user';
import { SupportAccessService } from './support-access.service';
import { RedeemSupportGrantDto } from './dto/support-access.dto';

// Platform side (Sparking Asia operator): see open support windows and redeem a
// code to open a scoped, auto-expiring session into that gym.
@ApiTags('platform')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.PLATFORM_MANAGE)
@Controller('platform/support-access')
export class SupportAccessPlatformController {
  constructor(private readonly support: SupportAccessService) {}

  @Get('requests')
  requests() {
    return this.support.requests();
  }

  @Post('redeem')
  redeem(@CurrentUser() user: AuthUser, @Body() dto: RedeemSupportGrantDto) {
    return this.support.redeem(dto.code, user.sub);
  }
}
