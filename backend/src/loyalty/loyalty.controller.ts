import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { LoyaltyService } from './loyalty.service';
import { AdjustPointsDto } from './loyalty.dto';

@ApiTags('loyalty')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.MEMBERS_MANAGE)
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get(':memberId')
  get(@Param('memberId') memberId: string) {
    return this.loyalty.summary(memberId);
  }

  @Post(':memberId/adjust')
  adjust(@GymId() gymId: string, @Param('memberId') memberId: string, @Body() dto: AdjustPointsDto) {
    return this.loyalty.award(gymId, memberId, dto.points, dto.reason ?? 'Manual adjustment');
  }
}
