import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { WaiversService } from './waivers.service';
import { UpsertWaiverDto } from './dto/waivers.dto';

@ApiTags('waivers')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.GYM_SETTINGS)
@Controller('waivers')
export class WaiversController {
  constructor(private readonly waivers: WaiversService) {}

  @Get()
  active(@GymId() gymId: string) {
    return this.waivers.activeWithStats(gymId);
  }

  @Post()
  upsert(@GymId() gymId: string, @Body() dto: UpsertWaiverDto) {
    return this.waivers.upsert(gymId, dto);
  }
}
