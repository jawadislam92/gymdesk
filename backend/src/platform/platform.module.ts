import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { PasswordService } from '../auth/password.service';

@Module({
  controllers: [PlatformController],
  providers: [PlatformService, PasswordService],
})
export class PlatformModule {}
