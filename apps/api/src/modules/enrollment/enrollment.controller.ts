import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentScheduleDto } from './dto/create-enrollment-schedule.dto';
import { SelfEnrollDto } from './dto/self-enroll.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

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
  selfEnroll(@Body() dto: SelfEnrollDto, @CurrentUser() user: AuthenticatedUser) {
    // TODO: same note as elsewhere — user.sub is the User id, not the
    // Student id, until a User->Student resolver helper exists
    return this.enrollmentService.selfEnroll(user.sub, dto.sectionId);
  }

  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @Post(':sectionId/withdraw')
  withdraw(@Param('sectionId') sectionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.enrollmentService.withdraw(user.sub, sectionId);
  }

  @Get('student/:studentId')
  listMine(@Param('studentId') studentId: string) {
    return this.enrollmentService.listMyEnrollments(studentId);
  }
}
