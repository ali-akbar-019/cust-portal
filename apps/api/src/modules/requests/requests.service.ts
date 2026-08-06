import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@cust/database';
import { CreateRequestDto } from './dto/create-request.dto';
import { ResolveRequestDto } from './dto/resolve-request.dto';

@Injectable()
export class RequestsService {
  create(studentId: string, dto: CreateRequestDto) {
    return prisma.request.create({
      data: {
        studentId,
        type: dto.type,
        details: dto.details,
        sectionId: dto.type === 'COURSE_WITHDRAW' ? dto.sectionId : null,
      },
    });
  }

  listMine(studentId: string) {
    return prisma.request.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  listAll() {
    return prisma.request.findMany({
      include: { student: { include: { user: { select: { email: true } } } } },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });
  }

  // COURSE_WITHDRAW has a real side effect on approval: the student's
  // Enrollment for that section actually flips to WITHDRAWN, freeing the
  // seat back up. Every other request type is purely a status/paper-trail
  // change (transcripts/letters get generated manually by staff outside
  // this system for now — see PROGRESS.md follow-up).
  async resolve(id: string, dto: ResolveRequestDto) {
    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');

    return prisma.$transaction(async (tx) => {
      const updated = await tx.request.update({
        where: { id },
        data: { status: dto.status, adminRemarks: dto.adminRemarks, resolvedAt: new Date() },
      });

      if (request.type === 'COURSE_WITHDRAW' && dto.status === 'APPROVED' && request.sectionId) {
        await tx.enrollment.updateMany({
          where: { studentId: request.studentId, sectionId: request.sectionId, status: 'ACTIVE' },
          data: { status: 'WITHDRAWN' },
        });
      }

      return updated;
    });
  }
}
