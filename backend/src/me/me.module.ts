import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { ClassesModule } from '../classes/classes.module';

@Module({
  imports: [ClassesModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
