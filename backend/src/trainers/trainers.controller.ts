import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { TrainersService } from './trainers.service';
import { CreateTrainerDto, UpdateTrainerDto } from './dto/trainers.dto';

@ApiTags('trainers')
@ApiBearerAuth()
@Controller('trainers')
export class TrainersController {
  constructor(private readonly trainers: TrainersService) {}

  // Reads — any authenticated staff (e.g. to assign a trainer to a member).
  @Get()
  list(@GymId() gymId: string) {
    return this.trainers.list(gymId);
  }

  @Get(':id/members')
  members(@GymId() gymId: string, @Param('id') id: string) {
    return this.trainers.membersOf(gymId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.TRAINERS_MANAGE)
  create(@GymId() gymId: string, @Body() dto: CreateTrainerDto) {
    return this.trainers.create(gymId, dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.TRAINERS_MANAGE)
  update(@GymId() gymId: string, @Param('id') id: string, @Body() dto: UpdateTrainerDto) {
    return this.trainers.update(gymId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.TRAINERS_MANAGE)
  remove(@GymId() gymId: string, @Param('id') id: string) {
    return this.trainers.remove(gymId, id);
  }
}
