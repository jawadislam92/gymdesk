import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { DietService } from './diet.service';
import { CreateDietPlanDto } from './dto/diet.dto';

@ApiTags('diet-plans')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.WORKOUTS_MANAGE)
@Controller('diet-plans')
export class DietController {
  constructor(private readonly diet: DietService) {}

  @Get()
  list(@GymId() gymId: string, @Query('memberId') memberId: string) {
    return this.diet.listForMember(gymId, memberId);
  }

  @Post()
  create(@GymId() gymId: string, @Body() dto: CreateDietPlanDto) {
    return this.diet.create(gymId, dto);
  }

  @Delete(':id')
  remove(@GymId() gymId: string, @Param('id') id: string) {
    return this.diet.remove(gymId, id);
  }
}
