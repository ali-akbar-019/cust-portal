import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@cust/database';
import { AuthService } from '../auth/auth.service';
import { CreateStudentDto } from './dto/create-student.dto';

@Injectable()
export class StudentsService {
  findAll() {
    return prisma.student.findMany({
      include: { user: { select: { email: true } }, department: true, section: true },
    });
  }

  async findById(id: string) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: { select: { email: true } }, department: true, section: true },
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  // Creates the User (role=STUDENT) and Student profile in one transaction,
  // so a half-created record (user with no student profile) can't happen.
  async create(dto: CreateStudentDto) {
    const passwordHash = await AuthService.hashPassword(dto.password);
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: dto.email, passwordHash, role: 'STUDENT' },
      });
      return tx.student.create({
        data: {
          userId: user.id,
          enrollmentNo: dto.enrollmentNo,
          departmentId: dto.departmentId,
          semester: dto.semester,
        },
      });
    });
  }

  // Aggregates timetable slots across every section the student is
  // actively enrolled in — a student takes multiple courses, so their
  // "my timetable" view is the union of each enrolled section's slots,
  // not a single section (the legacy Student.sectionId field is not used
  // for this — see the schema comment on that field).
  async getTimetable(studentId: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, status: 'ACTIVE' },
      select: { sectionId: true },
    });
    const sectionIds = enrollments.map((e) => e.sectionId);
    if (sectionIds.length === 0) return [];

    return prisma.timetableSlot.findMany({
      where: { sectionId: { in: sectionIds } },
      include: {
        room: { include: { floor: { include: { block: true } } } },
        section: { include: { course: true, teacher: { include: { user: true } } } },
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });
  }

  // All sections the student is actively enrolled in — used by the
  // frontend to populate "pick a course" dropdowns (assignments, feedback)
  // instead of asking the student to type a section ID.
  async getMySections(studentId: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, status: 'ACTIVE' },
      include: { section: { include: { course: true, teacher: { include: { user: true } } } } },
    });
    return enrollments.map((e) => e.section);
  }
}
