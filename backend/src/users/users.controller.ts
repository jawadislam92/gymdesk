import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { UsersService } from './users.service';
import { InviteStaffDto } from './dto/users.dto';

@ApiTags('users')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.STAFF_MANAGE)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@GymId() gymId: string) {
    return this.users.list(gymId);
  }

  @Post()
  invite(@GymId() gymId: string, @Body() dto: InviteStaffDto) {
    return this.users.invite(gymId, dto);
  }

  @Delete(':id')
  deactivate(@GymId() gymId: string, @Param('id') id: string) {
    return this.users.deactivate(gymId, id);
  }
}
