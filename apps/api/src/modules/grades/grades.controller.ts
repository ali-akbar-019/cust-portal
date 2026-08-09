import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { GradesService } from './grades.service';
import { TranscriptService } from './transcript.service';
import { UpsertGradeDto } from './dto/upsert-grade.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ensureOwnStudentOrElevated } from '../../common/guards/self-or-elevated.util';

@UseGuards(JwtAuthGuard)
@Controller('grades')
export class GradesController {
  constructor(
    private readonly gradesService: GradesService,
    private readonly transcriptService: TranscriptService,
  ) {}

  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Post()
  upsert(@Body() dto: UpsertGradeDto) {
    return this.gradesService.upsertGrade(dto);
  }

  @Get('student/:studentId')
  async getBreakdown(@Param('studentId') studentId: string, @CurrentUser() user: AuthenticatedUser) {
    await ensureOwnStudentOrElevated(user, studentId);
    return this.gradesService.getStudentBreakdown(studentId);
  }

  @Get('student/:studentId/transcript')
  async downloadTranscript(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    await ensureOwnStudentOrElevated(user, studentId);
    const pdf = await this.transcriptService.generateTranscript(studentId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="transcript-${studentId}.pdf"`,
    });
    res.send(pdf);
  }
}
