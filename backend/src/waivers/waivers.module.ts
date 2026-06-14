import { Module } from '@nestjs/common';
import { WaiversController } from './waivers.controller';
import { WaiversService } from './waivers.service';

@Module({
  controllers: [WaiversController],
  providers: [WaiversService],
  exports: [WaiversService],
})
export class WaiversModule {}
