import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @Post()
  submit(@Body() dto: SubmitFeedbackDto, @CurrentUser() user: AuthenticatedUser) {
    return this.feedbackService.submit(user.sub, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Get('section/:sectionId')
  getForSection(@Param('sectionId') sectionId: string) {
    return this.feedbackService.getForSection(sectionId);
  }

  @Get('mine/:studentId')
  getMine(@Param('studentId') studentId: string) {
    return this.feedbackService.getMySubmissions(studentId);
  }
}
