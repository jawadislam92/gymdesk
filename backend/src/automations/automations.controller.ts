import { Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AutomationsService } from './automations.service';

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

  @Post('run')
  run(@GymId() gymId: string) {
    return this.automations.runForGym(gymId);
  }
}
