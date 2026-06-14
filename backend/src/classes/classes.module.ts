import { Module } from '@nestjs/common';
import { BookingsController, ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

@Module({
  controllers: [ClassesController, BookingsController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
