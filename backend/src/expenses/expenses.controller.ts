import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthUser } from '../auth/types/auth-user';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/expenses.dto';

@ApiTags('expenses')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  list(@GymId() gymId: string) {
    return this.expenses.list(gymId);
  }

  @Post()
  create(@GymId() gymId: string, @Body() dto: CreateExpenseDto, @CurrentUser() u: AuthUser) {
    return this.expenses.create(gymId, dto, u.sub);
  }

  @Delete(':id')
  remove(@GymId() gymId: string, @Param('id') id: string) {
    return this.expenses.remove(gymId, id);
  }
}
