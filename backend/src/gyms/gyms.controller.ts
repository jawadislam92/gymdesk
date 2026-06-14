import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { GymsService } from './gyms.service';
import { UpdateGymDto } from './dto/gyms.dto';

@ApiTags('gym')
@ApiBearerAuth()
@Controller('gym')
export class GymsController {
  constructor(private readonly gyms: GymsService) {}

  // Any authenticated user can read their gym (name/currency shown in the UI).
  @Get()
  get(@GymId() gymId: string) {
    return this.gyms.getCurrent(gymId);
  }

  @Patch()
  @RequirePermissions(PERMISSIONS.GYM_SETTINGS)
  update(@GymId() gymId: string, @Body() dto: UpdateGymDto) {
    return this.gyms.update(gymId, dto);
  }
}
