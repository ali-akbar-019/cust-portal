import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@cust/database';
import { CreateEnrollmentScheduleDto } from './dto/create-enrollment-schedule.dto';

@Injectable()
export class EnrollmentService {
  createSchedule(dto: CreateEnrollmentScheduleDto) {
    return prisma.enrollmentSchedule.create({
      data: {
        departmentId: dto.departmentId,
        term: dto.term,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
      },
    });
  }

  async getActiveSchedule(departmentId: string) {
    const now = new Date();
    return prisma.enrollmentSchedule.findFirst({
      where: { departmentId, startsAt: { lte: now }, endsAt: { gte: now } },
    });
  }

  // Self-enrollment has three gates, checked in order so the error message
  // tells the student exactly why it failed rather than a generic 400:
  //   1. an enrollment window must currently be open for their department
  //   2. the section must have a free seat (capacity vs active enrollments)
  //   3. they can't already be enrolled (unique constraint backs this too,
  //      but we check first for a friendlier message than a raw DB error)
  async selfEnroll(studentId: string, sectionId: string) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    const activeSchedule = await this.getActiveSchedule(student.departmentId);
    if (!activeSchedule) {
      throw new BadRequestException('Enrollment is not currently open for your department');
    }

    const section = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');

    const activeCount = await prisma.enrollment.count({
      where: { sectionId, status: 'ACTIVE' },
    });
    if (activeCount >= section.capacity) {
      throw new BadRequestException('This section is already full');
    }

    const existing = await prisma.enrollment.findUnique({
      where: { studentId_sectionId: { studentId, sectionId } },
    });
    if (existing && existing.status === 'ACTIVE') {
      throw new BadRequestException('Already enrolled in this section');
    }

    return prisma.enrollment.upsert({
      where: { studentId_sectionId: { studentId, sectionId } },
      update: { status: 'ACTIVE', enrolledAt: new Date() },
      create: { studentId, sectionId, status: 'ACTIVE' },
    });
  }

  async withdraw(studentId: string, sectionId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_sectionId: { studentId, sectionId } },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    return prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: 'WITHDRAWN' },
    });
  }

  listMyEnrollments(studentId: string) {
    return prisma.enrollment.findMany({
      where: { studentId, status: 'ACTIVE' },
      include: { section: { include: { course: true, teacher: { include: { user: true } } } } },
    });
  }
}
