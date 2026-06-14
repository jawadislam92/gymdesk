import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PlansService } from './plans.service';
import { CreatePlanDto, UpdatePlanDto } from './dto/plans.dto';

@ApiTags('membership-plans')
@ApiBearerAuth()
@Controller('membership-plans')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  // Any authenticated staff/reception can view plans (needed to sell memberships).
  @Get()
  list(@GymId() gymId: string, @Query('includeInactive') includeInactive?: string) {
    return this.plans.list(gymId, includeInactive === 'true');
  }

  @Get(':id')
  get(@GymId() gymId: string, @Param('id') id: string) {
    return this.plans.get(gymId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PLANS_MANAGE)
  create(@GymId() gymId: string, @Body() dto: CreatePlanDto) {
    return this.plans.create(gymId, dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PLANS_MANAGE)
  update(@GymId() gymId: string, @Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plans.update(gymId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PLANS_MANAGE)
  archive(@GymId() gymId: string, @Param('id') id: string) {
    return this.plans.archive(gymId, id);
  }
}
