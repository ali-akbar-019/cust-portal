import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { resolveStudentId } from '../../common/guards/resolve-student-id.util';

@UseGuards(JwtAuthGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get('section/:sectionId')
  findBySection(@Param('sectionId') sectionId: string) {
    return this.assignmentsService.findBySection(sectionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assignmentsService.findById(id);
  }

  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Post()
  create(@Body() dto: CreateAssignmentDto) {
    return this.assignmentsService.create(dto);
  }

  // TODO (production): swap disk storage for direct-to-R2/S3 upload
  // (presigned URL flow) so files don't live on the API server's disk.
  // Kept as local disk storage for now to get the deadline-lock and
  // grading flow working end to end without cloud credentials.
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return { fileUrl: `/uploads/${file.filename}` };
  }

  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @Post(':id/submit')
  async submit(
    @Param('id') assignmentId: string,
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const studentId = await resolveStudentId(user);
    return this.assignmentsService.submit(assignmentId, studentId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Post('submissions/:submissionId/grade')
  grade(@Param('submissionId') submissionId: string, @Body() dto: GradeSubmissionDto) {
    return this.assignmentsService.grade(submissionId, dto);
  }
}
