import { Module } from '@nestjs/common';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';

@Module({
  controllers: [AutomationsController],
  providers: [AutomationsService],
})
export class AutomationsModule {}
