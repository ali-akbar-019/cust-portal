import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ensureOwnStudentOrElevated } from '../../common/guards/self-or-elevated.util';

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
  async getStudentAttendance(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('sectionId') sectionId?: string,
  ) {
    await ensureOwnStudentOrElevated(user, studentId);
    return this.attendanceService.getStudentAttendance(studentId, sectionId);
  }
}
