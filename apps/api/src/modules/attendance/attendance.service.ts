import { Injectable } from '@nestjs/common';
import { prisma } from '@cust/database';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

const LOW_ATTENDANCE_THRESHOLD = 75;

@Injectable()
export class AttendanceService {
  // Bulk upsert: re-marking the same section/date overwrites each
  // student's status rather than creating duplicates (unique constraint
  // on [sectionId, studentId, date] in the schema backs this).
  async bulkMark(dto: MarkAttendanceDto) {
    const date = new Date(dto.date);
    const results = await prisma.$transaction(
      dto.records.map((r) =>
        prisma.attendance.upsert({
          where: {
            sectionId_studentId_date: { sectionId: dto.sectionId, studentId: r.studentId, date },
          },
          update: { status: r.status },
          create: { sectionId: dto.sectionId, studentId: r.studentId, date, status: r.status },
        }),
      ),
    );
    return { markedCount: results.length };
  }

  async getStudentAttendance(studentId: string, sectionId?: string) {
    const records = await prisma.attendance.findMany({
      where: { studentId, ...(sectionId ? { sectionId } : {}) },
      orderBy: { date: 'desc' },
    });

    const total = records.length;
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const percentage = total === 0 ? 100 : Math.round((present / total) * 1000) / 10;

    return {
      records,
      total,
      present,
      percentage,
      isLow: percentage < LOW_ATTENDANCE_THRESHOLD,
      threshold: LOW_ATTENDANCE_THRESHOLD,
    };
  }

  getSectionRoster(sectionId: string, date: string) {
    // students in the section + whether they already have a record for this date
    return prisma.student.findMany({
      where: { sectionId },
      include: {
        user: { select: { email: true } },
        attendances: { where: { sectionId, date: new Date(date) } },
      },
    });
  }
}
