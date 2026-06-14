import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { TrainersService } from './trainers.service';

// Reads only — any authenticated staff may view trainers (e.g. to assign one to
// a member). Trainers are created via the staff-invite flow (role = trainer).
@ApiTags('trainers')
@ApiBearerAuth()
@Controller('trainers')
export class TrainersController {
  constructor(private readonly trainers: TrainersService) {}

  @Get()
  list(@GymId() gymId: string) {
    return this.trainers.list(gymId);
  }

  @Get(':id/members')
  members(@GymId() gymId: string, @Param('id') id: string) {
    return this.trainers.membersOf(gymId, id);
  }
}
