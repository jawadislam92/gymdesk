import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { PasswordService } from '../auth/password.service';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [LoyaltyModule],
  controllers: [MembersController],
  providers: [MembersService, PasswordService],
  exports: [MembersService],
})
export class MembersModule {}
