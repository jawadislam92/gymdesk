import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { MembersService } from './members.service';
import { CreateMemberDto, MemberListQueryDto, UpdateMemberDto } from './dto/members.dto';

@ApiTags('members')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.MEMBERS_MANAGE)
@Controller('members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Post()
  create(@GymId() gymId: string, @Body() dto: CreateMemberDto) {
    return this.members.create(gymId, dto);
  }

  @Get()
  list(@GymId() gymId: string, @Query() query: MemberListQueryDto) {
    return this.members.list(gymId, query);
  }

  @Get(':id')
  get(@GymId() gymId: string, @Param('id') id: string) {
    return this.members.get(gymId, id);
  }

  @Patch(':id')
  update(@GymId() gymId: string, @Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.members.update(gymId, id, dto);
  }

  @Delete(':id')
  remove(@GymId() gymId: string, @Param('id') id: string) {
    return this.members.remove(gymId, id);
  }
}
