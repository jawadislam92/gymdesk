import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [PaymentsModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
