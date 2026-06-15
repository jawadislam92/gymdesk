import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthUser } from '../auth/types/auth-user';
import { LeadsService } from './leads.service';
import { AddLeadActivityDto, CreateLeadDto, UpdateLeadDto } from './dto/leads.dto';

@ApiTags('leads')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.MEMBERS_MANAGE)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  list(@GymId() gymId: string) {
    return this.leads.list(gymId);
  }

  @Get('pipeline')
  pipeline(@GymId() gymId: string) {
    return this.leads.pipeline(gymId);
  }

  @Post()
  create(@GymId() gymId: string, @Body() dto: CreateLeadDto) {
    return this.leads.create(gymId, dto);
  }

  @Get(':id')
  get(@GymId() gymId: string, @Param('id') id: string) {
    return this.leads.get(gymId, id);
  }

  @Patch(':id')
  update(
    @GymId() gymId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.leads.update(gymId, id, dto, u.sub);
  }

  @Post(':id/activities')
  addActivity(
    @GymId() gymId: string,
    @Param('id') id: string,
    @Body() dto: AddLeadActivityDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.leads.addActivity(gymId, id, dto, u.sub);
  }

  @Post(':id/convert')
  convert(@GymId() gymId: string, @Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.leads.convert(gymId, id, u.sub);
  }
}
