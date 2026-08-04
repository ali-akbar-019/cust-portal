import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Post('mark')
  mark(@Body() dto: MarkAttendanceDto) {
    return this.attendanceService.bulkMark(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Get('section/:sectionId/roster')
  getRoster(@Param('sectionId') sectionId: string, @Query('date') date: string) {
    return this.attendanceService.getSectionRoster(sectionId, date);
  }

  @Get('student/:studentId')
  getStudentAttendance(@Param('studentId') studentId: string, @Query('sectionId') sectionId?: string) {
    // TODO: once req.user is threaded through, restrict a STUDENT caller to
    // only ever fetching their own studentId here (same note as students.controller.ts)
    return this.attendanceService.getStudentAttendance(studentId, sectionId);
  }
}
