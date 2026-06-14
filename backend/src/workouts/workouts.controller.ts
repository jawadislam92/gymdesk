import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { WorkoutsService } from './workouts.service';
import { CreateWorkoutPlanDto, WorkoutExerciseDto } from './dto/workouts.dto';

@ApiTags('workout-plans')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.WORKOUTS_MANAGE)
@Controller('workout-plans')
export class WorkoutsController {
  constructor(private readonly workouts: WorkoutsService) {}

  @Get()
  list(@GymId() gymId: string, @Query('memberId') memberId: string) {
    return this.workouts.listForMember(gymId, memberId);
  }

  @Post()
  create(@GymId() gymId: string, @Body() dto: CreateWorkoutPlanDto) {
    return this.workouts.create(gymId, dto);
  }

  @Post(':id/exercises')
  addExercise(@GymId() gymId: string, @Param('id') id: string, @Body() dto: WorkoutExerciseDto) {
    return this.workouts.addExercise(gymId, id, dto);
  }

  @Delete(':id')
  remove(@GymId() gymId: string, @Param('id') id: string) {
    return this.workouts.remove(gymId, id);
  }
}
