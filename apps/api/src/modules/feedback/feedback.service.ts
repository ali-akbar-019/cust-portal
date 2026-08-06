import { Injectable } from '@nestjs/common';
import { prisma } from '@cust/database';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@Injectable()
export class FeedbackService {
  submit(studentId: string, dto: SubmitFeedbackDto) {
    // upsert: a student resubmitting for the same section updates their
    // existing feedback rather than creating a second row (the unique
    // constraint would reject a duplicate insert anyway)
    return prisma.feedback.upsert({
      where: { studentId_sectionId: { studentId, sectionId: dto.sectionId } },
      update: { rating: dto.rating, comments: dto.comments },
      create: { studentId, sectionId: dto.sectionId, rating: dto.rating, comments: dto.comments },
    });
  }

  // Deliberately anonymized: a teacher sees the aggregate rating and the
  // list of comments, but never which student wrote which comment. This
  // matches how real course-evaluation systems work — identifying
  // reviewers discourages honest feedback. Only the average + count +
  // comment text go back, nothing that traces to a specific student.
  async getForSection(sectionId: string) {
    const entries = await prisma.feedback.findMany({ where: { sectionId } });
    const count = entries.length;
    const average = count === 0 ? null : Math.round((entries.reduce((s, e) => s + e.rating, 0) / count) * 10) / 10;

    return {
      count,
      average,
      comments: entries.filter((e) => e.comments).map((e) => e.comments),
    };
  }

  getMySubmissions(studentId: string) {
    return prisma.feedback.findMany({
      where: { studentId },
      include: { section: { include: { course: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
