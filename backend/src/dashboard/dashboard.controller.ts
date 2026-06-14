import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  summary(@GymId() gymId: string) {
    return this.dashboard.summary(gymId);
  }
}
