import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@gymflow/shared';
import { GymId } from '../auth/decorators/gym-id.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { BillingService } from './billing.service';
import { CheckoutDto, ConfirmDto } from './billing.dto';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  /** Any authenticated user: lets the UI show/hide online-payment controls. */
  @Get('status')
  status() {
    return { enabled: this.billing.isEnabled() };
  }

  @Post('checkout')
  @RequirePermissions(PERMISSIONS.PAYMENTS_COLLECT)
  checkout(@GymId() gymId: string, @Body() dto: CheckoutDto) {
    return this.billing.createCheckout(gymId, dto);
  }

  @Post('confirm')
  @RequirePermissions(PERMISSIONS.PAYMENTS_COLLECT)
  confirm(@GymId() gymId: string, @Body() dto: ConfirmDto) {
    return this.billing.confirm(gymId, dto.sessionId);
  }
}
