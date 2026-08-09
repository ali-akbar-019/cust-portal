import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@cust/database';
import { AuthService } from '../auth/auth.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';

@Injectable()
export class TeachersService {
  findAll() {
    return prisma.teacher.findMany({
      include: { user: { select: { email: true } }, department: true },
    });
  }

  async findById(id: string) {
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: { user: { select: { email: true } }, department: true, sections: true },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');
    return teacher;
  }

  async create(dto: CreateTeacherDto) {
    const passwordHash = await AuthService.hashPassword(dto.password);
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: dto.email, passwordHash, role: 'TEACHER' },
      });
      return tx.teacher.create({
        data: { userId: user.id, departmentId: dto.departmentId, designation: dto.designation },
      });
    });
  }

  async getTimetable(teacherId: string) {
    const sections = await prisma.section.findMany({ where: { teacherId }, select: { id: true } });
    const sectionIds = sections.map((s) => s.id);
    return prisma.timetableSlot.findMany({
      where: { sectionId: { in: sectionIds } },
      include: { room: { include: { floor: { include: { block: true } } } }, section: { include: { course: true } } },
    });
  }

  // All sections this teacher teaches — feeds the "pick a section" dropdown
  // on the attendance/grades/assignments pages instead of asking the
  // teacher to type a section ID they'd have no way of knowing.
  async getMySections(teacherId: string) {
    const sections = await prisma.section.findMany({
      where: { teacherId },
      include: { course: true, _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } } },
    });
    return sections.map((s) => ({ ...s, enrolledCount: s._count.enrollments }));
  }
}
