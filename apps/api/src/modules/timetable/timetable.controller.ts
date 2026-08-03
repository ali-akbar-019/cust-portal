import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { TimetableGeneratorService } from './generator/timetable-generator.service';
import { CreateSlotDto } from './dto/create-slot.dto';

@Controller('timetable')
export class TimetableController {
  constructor(
    private readonly timetableService: TimetableService,
    private readonly generatorService: TimetableGeneratorService,
  ) {}

  @Get('student/:studentId')
  getStudentTimetable() {
    // TODO: return timetable filtered by student's section
  }

  @Get('teacher/:teacherId')
  getTeacherTimetable() {
    // TODO: return timetable filtered by teacher's assigned sections
  }

  @Post('slots')
  createSlot(@Body() dto: CreateSlotDto) {
    // TODO: runs clash detection before persisting
  }

  @Post('generate')
  generateTimetable(@Query('departmentId') departmentId: string) {
    // TODO: trigger auto-generation for a department/semester
    return this.generatorService.generate(departmentId);
  }
}
