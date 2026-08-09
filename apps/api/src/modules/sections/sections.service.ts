import { Injectable } from '@nestjs/common';
import { prisma } from '@cust/database';

@Injectable()
export class SectionsService {
  async findByDepartment(departmentId: string) {
    const sections = await prisma.section.findMany({
      where: { course: { departmentId } },
      include: {
        course: true,
        teacher: { include: { user: { select: { email: true } } } },
        _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } },
      },
    });
    // surface remaining seats directly so the frontend doesn't have to compute it
    return sections.map((s) => ({ ...s, seatsRemaining: s.capacity - s._count.enrollments }));
  }

  // Enrolled roster for a section — used by the teacher's grade-entry
  // and attendance pages so they pick a student from a dropdown instead
  // of typing a raw student id.
  async getRoster(sectionId: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: { sectionId, status: 'ACTIVE' },
      include: { student: { include: { user: { select: { email: true } } } } },
    });
    return enrollments.map((e) => e.student);
  }
}
