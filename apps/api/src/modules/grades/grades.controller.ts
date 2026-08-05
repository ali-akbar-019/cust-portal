import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GradesService } from './grades.service';
import { UpsertGradeDto } from './dto/upsert-grade.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Post()
  upsert(@Body() dto: UpsertGradeDto) {
    return this.gradesService.upsertGrade(dto);
  }

  @Get('student/:studentId')
  getBreakdown(@Param('studentId') studentId: string) {
    // TODO: same restrict-to-self note as attendance/students controllers
    return this.gradesService.getStudentBreakdown(studentId);
  }
}
