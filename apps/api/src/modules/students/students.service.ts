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

  async getTimetable(studentId: string) {
    const student = await this.findById(studentId);
    if (!student.sectionId) return [];
    return prisma.timetableSlot.findMany({
      where: { sectionId: student.sectionId },
      include: { room: { include: { floor: { include: { block: true } } } }, section: { include: { course: true, teacher: { include: { user: true } } } } },
    });
  }
}
