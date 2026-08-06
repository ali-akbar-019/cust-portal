import { ForbiddenException } from '@nestjs/common';
import { prisma } from '@cust/database';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * The JWT payload only carries the User id (user.sub), not the Student
 * profile id — but every studentId-scoped table (Enrollment, Submission,
 * Feedback, Request, Complaint, BookReservation, LibraryClearance, ...)
 * has a foreign key to Student.id, not User.id. Any endpoint that writes
 * "the current student's own record" must resolve the real Student.id
 * first via this helper, rather than passing user.sub straight through —
 * doing that would violate the foreign key (or silently write the wrong id
 * if the column happened to accept it).
 */
export async function resolveStudentId(user: AuthenticatedUser): Promise<string> {
  const student = await prisma.student.findUnique({
    where: { userId: user.sub },
    select: { id: true },
  });
  if (!student) {
    throw new ForbiddenException('No student profile is associated with this account');
  }
  return student.id;
}
