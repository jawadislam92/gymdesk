import { Module } from '@nestjs/common';
import { RenewalsController } from './renewals.controller';
import { RenewalsService } from './renewals.service';

@Module({
  controllers: [RenewalsController],
  providers: [RenewalsService],
})
export class RenewalsModule {}
