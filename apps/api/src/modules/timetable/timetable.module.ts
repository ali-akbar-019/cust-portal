import { Module } from '@nestjs/common';
import { TimetableController } from './timetable.controller';
import { TimetableService } from './timetable.service';
import { TimetableGeneratorService } from './generator/timetable-generator.service';

@Module({
  controllers: [TimetableController],
  providers: [TimetableService, TimetableGeneratorService],
  exports: [TimetableService, TimetableGeneratorService],
})
export class TimetableModule {}
