import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthUser } from '../auth/types/auth-user';
import { ProgressService } from './progress.service';
import { StaffCreateProgressDto } from './dto/progress.dto';

@ApiTags('progress')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.PROGRESS_RECORD)
@Controller('progress')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  list(@GymId() gymId: string, @Query('memberId') memberId: string) {
    return this.progress.listForMember(gymId, memberId);
  }

  @Post()
  create(@GymId() gymId: string, @Body() dto: StaffCreateProgressDto, @CurrentUser() u: AuthUser) {
    return this.progress.create(gymId, dto.memberId, dto, u.sub);
  }
}
