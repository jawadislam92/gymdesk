import { Module } from '@nestjs/common';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';

@Module({
  controllers: [PosController],
  providers: [PosService],
})
export class PosModule {}
