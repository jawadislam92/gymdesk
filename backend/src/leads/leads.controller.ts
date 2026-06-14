import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { LeadsService } from './leads.service';
import { UpdateLeadStatusDto } from './dto/leads.dto';

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

  @Patch(':id')
  update(@GymId() gymId: string, @Param('id') id: string, @Body() dto: UpdateLeadStatusDto) {
    return this.leads.updateStatus(gymId, id, dto.status);
  }
}
