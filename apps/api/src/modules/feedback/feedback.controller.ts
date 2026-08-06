import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ensureOwnStudentOrElevated } from '../../common/guards/self-or-elevated.util';
import { resolveStudentId } from '../../common/guards/resolve-student-id.util';

@UseGuards(JwtAuthGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @Post()
  async submit(@Body() dto: SubmitFeedbackDto, @CurrentUser() user: AuthenticatedUser) {
    const studentId = await resolveStudentId(user);
    return this.feedbackService.submit(studentId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Get('section/:sectionId')
  getForSection(@Param('sectionId') sectionId: string) {
    return this.feedbackService.getForSection(sectionId);
  }

  @Get('mine/:studentId')
  async getMine(@Param('studentId') studentId: string, @CurrentUser() user: AuthenticatedUser) {
    await ensureOwnStudentOrElevated(user, studentId);
    return this.feedbackService.getMySubmissions(studentId);
  }
}
