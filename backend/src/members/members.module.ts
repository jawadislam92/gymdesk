import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { PasswordService } from '../auth/password.service';

@Module({
  controllers: [MembersController],
  providers: [MembersService, PasswordService],
  exports: [MembersService],
})
export class MembersModule {}
