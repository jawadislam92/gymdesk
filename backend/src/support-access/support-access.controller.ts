import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthUser } from '../auth/types/auth-user';
import { SupportAccessService } from './support-access.service';
import { CreateSupportGrantDto } from './dto/support-access.dto';

// Tenant side: a gym owner grants the platform temporary, scoped access to fix
// a reported issue. Gated on gym.settings (owner / manager).
@ApiTags('support-access')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.GYM_SETTINGS)
@Controller('support-access')
export class SupportAccessController {
  constructor(private readonly support: SupportAccessService) {}

  @Get()
  list(@GymId() gymId: string) {
    return this.support.list(gymId);
  }

  @Post()
  mint(@GymId() gymId: string, @CurrentUser() user: AuthUser, @Body() dto: CreateSupportGrantDto) {
    return this.support.mint(gymId, user.sub, dto);
  }

  @Delete(':id')
  revoke(@GymId() gymId: string, @CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.support.revoke(gymId, id, user.sub);
  }
}
