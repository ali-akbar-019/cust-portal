import { ForbiddenException } from '@nestjs/common';
import { prisma } from '@cust/database';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Call this at the top of any controller method that takes a :studentId
 * (or similar) URL param and returns that student's own data. ADMIN and
 * TEACHER callers pass through untouched — they're allowed to look up any
 * student. A STUDENT caller is only allowed through if the id in the URL
 * actually belongs to them; otherwise this throws 403 rather than letting
 * one student read another's attendance/grades/invoices/etc by guessing IDs.
 */
export async function ensureOwnStudentOrElevated(
  user: AuthenticatedUser,
  requestedStudentId: string,
): Promise<void> {
  if (user.role !== 'STUDENT') return;

  const student = await prisma.student.findUnique({
    where: { id: requestedStudentId },
    select: { userId: true },
  });

  if (!student || student.userId !== user.sub) {
    throw new ForbiddenException("You can only access your own data");
  }
}
