import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AutomationsService } from './automations.service';
import { CreateAutomationDto, UpdateAutomationDto } from './dto/automations.dto';

@ApiTags('automations')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.MEMBERS_MANAGE)
@Controller('automations')
export class AutomationsController {
  constructor(private readonly automations: AutomationsService) {}

  @Get('status')
  status() {
    return { channels: this.automations.channelStatus() };
  }

  @Get('log')
  log(@GymId() gymId: string) {
    return this.automations.log(gymId);
  }

  @Get()
  list(@GymId() gymId: string) {
    return this.automations.list(gymId);
  }

  @Post()
  create(@GymId() gymId: string, @Body() dto: CreateAutomationDto) {
    return this.automations.create(gymId, dto);
  }

  @Patch(':id')
  update(@GymId() gymId: string, @Param('id') id: string, @Body() dto: UpdateAutomationDto) {
    return this.automations.update(gymId, id, dto);
  }

  @Delete(':id')
  remove(@GymId() gymId: string, @Param('id') id: string) {
    return this.automations.remove(gymId, id);
  }

  @Post('run')
  run(@GymId() gymId: string) {
    return this.automations.runForGym(gymId);
  }
}
