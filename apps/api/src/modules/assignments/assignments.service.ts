import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@cust/database';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

@Injectable()
export class AssignmentsService {
  create(dto: CreateAssignmentDto) {
    return prisma.assignment.create({
      data: {
        sectionId: dto.sectionId,
        title: dto.title,
        description: dto.description,
        deadline: new Date(dto.deadline),
        fileUrl: dto.fileUrl,
      },
    });
  }

  findBySection(sectionId: string) {
    return prisma.assignment.findMany({
      where: { sectionId },
      orderBy: { deadline: 'asc' },
    });
  }

  async findById(id: string) {
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { submissions: true },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  // Deadline is enforced server-side (never trust the client's clock) —
  // late submissions are rejected outright rather than silently accepted
  // and flagged, since the requirement was a hard lock.
  async submit(assignmentId: string, studentId: string, dto: CreateSubmissionDto) {
    const assignment = await this.findById(assignmentId);
    if (new Date() > assignment.deadline) {
      throw new BadRequestException('Submission deadline has passed');
    }

    return prisma.submission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      update: { fileUrl: dto.fileUrl, submittedAt: new Date() },
      create: { assignmentId, studentId, fileUrl: dto.fileUrl },
    });
  }

  async grade(submissionId: string, dto: GradeSubmissionDto) {
    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (!submission) throw new NotFoundException('Submission not found');

    return prisma.submission.update({
      where: { id: submissionId },
      data: { grade: dto.grade, feedback: dto.feedback },
    });
  }

  getStudentSubmission(assignmentId: string, studentId: string) {
    return prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
    });
  }
}
