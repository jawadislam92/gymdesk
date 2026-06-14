import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PlatformService } from './platform.service';
import { PlatformCreateGymDto, UpdateSubscriptionDto } from './dto/platform.dto';

// Platform operator (Sparking Asia). PLATFORM_MANAGE is held only by super_admin,
// whose account has no gym — so these endpoints are cross-gym (no @GymId scope).
@ApiTags('platform')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.PLATFORM_MANAGE)
@Controller('platform')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('overview')
  overview() {
    return this.platform.overview();
  }

  @Get('gyms')
  gyms() {
    return this.platform.listGyms();
  }

  @Post('gyms')
  createGym(@Body() dto: PlatformCreateGymDto) {
    return this.platform.createGym(dto);
  }

  @Patch('gyms/:id/subscription')
  updateSubscription(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.platform.updateSubscription(id, dto);
  }
}
