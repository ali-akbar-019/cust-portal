import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@cust/database';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  findAll() {
    // never return passwordHash to the client
    return prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true },
    });
  }

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, createdAt: true },
    });
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await AuthService.hashPassword(dto.password);
    return prisma.user.create({
      data: { email: dto.email, passwordHash, role: dto.role },
      select: { id: true, email: true, role: true, createdAt: true },
    });
  }

  // Resolves the logged-in user's own profile IDs (studentId/teacherId,
  // plus sectionId/departmentId where relevant) from the JWT's user id.
  // Every "my timetable / my attendance / my grades" page on the frontend
  // calls this once and reuses the result, instead of the frontend having
  // to already know its own studentId/teacherId — which it never does
  // right after login (the JWT only carries the User id and role).
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        student: { select: { id: true, sectionId: true, departmentId: true, enrollmentNo: true } },
        teacher: { select: { id: true, departmentId: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      studentId: user.student?.id ?? null,
      sectionId: user.student?.sectionId ?? null,
      enrollmentNo: user.student?.enrollmentNo ?? null,
      teacherId: user.teacher?.id ?? null,
      departmentId: user.student?.departmentId ?? user.teacher?.departmentId ?? null,
    };
  }
}
