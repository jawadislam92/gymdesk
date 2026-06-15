import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthUser } from '../auth/types/auth-user';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, PaymentListQueryDto } from './dto/payments.dto';

@ApiTags('payments')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.PAYMENTS_COLLECT)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list(
    @GymId() gymId: string,
    @Query() query: PaymentListQueryDto,
    @Query('memberId') memberId?: string,
  ) {
    return this.payments.list(gymId, { ...query, memberId });
  }

  @Get(':id')
  get(@GymId() gymId: string, @Param('id') id: string) {
    return this.payments.get(gymId, id);
  }

  @Post()
  create(@GymId() gymId: string, @Body() dto: CreatePaymentDto, @CurrentUser() user: AuthUser) {
    return this.payments.create(gymId, dto, user.sub);
  }

  @Post(':id/collect')
  collect(@GymId() gymId: string, @Param('id') id: string) {
    return this.payments.collect(gymId, id);
  }
}
