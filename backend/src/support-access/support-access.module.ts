import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupportAccessService } from './support-access.service';
import { SupportAccessController } from './support-access.controller';
import { SupportAccessPlatformController } from './support-access.platform.controller';

@Module({
  imports: [AuthModule], // for TokenService (minting the scoped support token)
  controllers: [SupportAccessController, SupportAccessPlatformController],
  providers: [SupportAccessService],
})
export class SupportAccessModule {}
