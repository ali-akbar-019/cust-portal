import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@cust/database';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';

@Injectable()
export class ComplaintsService {
  create(studentId: string, dto: CreateComplaintDto) {
    return prisma.complaint.create({
      data: { studentId, subject: dto.subject, description: dto.description },
    });
  }

  listMine(studentId: string) {
    return prisma.complaint.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admins triage everything, OPEN first so nothing new gets buried
  // under already-in-progress items.
  listAll() {
    return prisma.complaint.findMany({
      include: { student: { include: { user: { select: { email: true } } } } },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async update(id: string, dto: UpdateComplaintDto) {
    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new NotFoundException('Complaint not found');

    return prisma.complaint.update({
      where: { id },
      data: {
        status: dto.status,
        response: dto.response,
        resolvedAt: dto.status === 'RESOLVED' ? new Date() : null,
      },
    });
  }
}
