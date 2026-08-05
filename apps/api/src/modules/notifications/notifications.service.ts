import { Injectable } from '@nestjs/common';
import { prisma } from '@cust/database';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class NotificationsService {
  create(postedById: string, dto: CreateAnnouncementDto) {
    return prisma.announcement.create({
      data: {
        postedById,
        title: dto.title,
        message: dto.message,
        target: dto.target,
        departmentId: dto.target === 'DEPARTMENT' ? dto.departmentId : null,
        sectionId: dto.target === 'SECTION' ? dto.sectionId : null,
      },
    });
  }

  // Returns everything targeted at ALL, plus anything targeted at this
  // user's department or section specifically — so a student only sees
  // announcements relevant to them, not the entire university's feed.
  findForRecipient(departmentId?: string, sectionId?: string) {
    return prisma.announcement.findMany({
      where: {
        OR: [
          { target: 'ALL' },
          ...(departmentId ? [{ target: 'DEPARTMENT' as const, departmentId }] : []),
          ...(sectionId ? [{ target: 'SECTION' as const, sectionId }] : []),
        ],
      },
      include: { postedBy: { select: { email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
