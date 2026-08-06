import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentScheduleDto } from './dto/create-enrollment-schedule.dto';
import { SelfEnrollDto } from './dto/self-enroll.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { resolveStudentId } from '../../common/guards/resolve-student-id.util';
import { ensureOwnStudentOrElevated } from '../../common/guards/self-or-elevated.util';

@UseGuards(JwtAuthGuard)
@Controller('enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('schedules')
  createSchedule(@Body() dto: CreateEnrollmentScheduleDto) {
    return this.enrollmentService.createSchedule(dto);
  }

  @Get('schedules/active')
  getActiveSchedule(@Query('departmentId') departmentId: string) {
    return this.enrollmentService.getActiveSchedule(departmentId);
  }

  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @Post()
  async selfEnroll(@Body() dto: SelfEnrollDto, @CurrentUser() user: AuthenticatedUser) {
    const studentId = await resolveStudentId(user);
    return this.enrollmentService.selfEnroll(studentId, dto.sectionId);
  }

  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @Post(':sectionId/withdraw')
  async withdraw(@Param('sectionId') sectionId: string, @CurrentUser() user: AuthenticatedUser) {
    const studentId = await resolveStudentId(user);
    return this.enrollmentService.withdraw(studentId, sectionId);
  }

  @Get('student/:studentId')
  async listMine(@Param('studentId') studentId: string, @CurrentUser() user: AuthenticatedUser) {
    await ensureOwnStudentOrElevated(user, studentId);
    return this.enrollmentService.listMyEnrollments(studentId);
  }
}
