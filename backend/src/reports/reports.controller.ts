import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('revenue')
  revenue(@GymId() gymId: string, @Query('months') months?: string) {
    return this.reports.revenue(gymId, months ? Number(months) : 6);
  }

  @Get('membership-growth')
  growth(@GymId() gymId: string, @Query('months') months?: string) {
    return this.reports.membershipGrowth(gymId, months ? Number(months) : 6);
  }

  @Get('attendance')
  attendance(@GymId() gymId: string, @Query('days') days?: string) {
    return this.reports.attendance(gymId, days ? Number(days) : 14);
  }
}
