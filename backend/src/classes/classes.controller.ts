import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { ClassesService } from './classes.service';
import { BookClassDto, CreateClassDto, UpdateClassDto } from './dto/classes.dto';

@ApiTags('classes')
@ApiBearerAuth()
@Controller('classes')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CLASSES_BOOK)
  list(@GymId() gymId: string, @Query('from') from?: string, @Query('to') to?: string) {
    const parse = (s?: string): Date | undefined => {
      if (!s) return undefined;
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };
    return this.classes.list(gymId, parse(from), parse(to));
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.CLASSES_BOOK)
  get(@GymId() gymId: string, @Param('id') id: string) {
    return this.classes.get(gymId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CLASSES_MANAGE)
  create(@GymId() gymId: string, @Body() dto: CreateClassDto) {
    return this.classes.create(gymId, dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.CLASSES_MANAGE)
  update(@GymId() gymId: string, @Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.classes.update(gymId, id, dto);
  }

  @Post(':id/cancel')
  @RequirePermissions(PERMISSIONS.CLASSES_MANAGE)
  cancel(@GymId() gymId: string, @Param('id') id: string) {
    return this.classes.cancel(gymId, id);
  }

  @Post(':id/book')
  @RequirePermissions(PERMISSIONS.CLASSES_BOOK)
  book(@GymId() gymId: string, @Param('id') id: string, @Body() dto: BookClassDto) {
    return this.classes.book(gymId, id, dto.memberId);
  }
}

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly classes: ClassesService) {}

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.CLASSES_BOOK)
  cancel(@GymId() gymId: string, @Param('id') id: string) {
    return this.classes.cancelBooking(gymId, id);
  }
}
