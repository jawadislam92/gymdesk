import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { ClassesModule } from '../classes/classes.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [LeadsModule, ClassesModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
