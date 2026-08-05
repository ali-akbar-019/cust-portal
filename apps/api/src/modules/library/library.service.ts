import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@cust/database';
import { ResolveClearanceDto } from './dto/resolve-clearance.dto';

@Injectable()
export class LibraryService {
  findAllBooks() {
    return prisma.book.findMany({ orderBy: { title: 'asc' } });
  }

  // Reserving decrements availableCopies immediately (optimistic — treats a
  // reservation as a hold on a physical copy) rather than only at pickup,
  // so the catalog never shows a copy as available when it's already spoken for.
  async reserveBook(studentId: string, bookId: string) {
    return prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({ where: { id: bookId } });
      if (!book) throw new NotFoundException('Book not found');
      if (book.availableCopies <= 0) throw new BadRequestException('No copies available');

      await tx.book.update({
        where: { id: bookId },
        data: { availableCopies: { decrement: 1 } },
      });

      return tx.bookReservation.create({
        data: { bookId, studentId, status: 'PENDING' },
      });
    });
  }

  async cancelReservation(reservationId: string, studentId: string) {
    const reservation = await prisma.bookReservation.findUnique({ where: { id: reservationId } });
    if (!reservation || reservation.studentId !== studentId) {
      throw new NotFoundException('Reservation not found');
    }
    return prisma.$transaction(async (tx) => {
      await tx.book.update({
        where: { id: reservation.bookId },
        data: { availableCopies: { increment: 1 } },
      });
      return tx.bookReservation.update({
        where: { id: reservationId },
        data: { status: 'CANCELLED' },
      });
    });
  }

  listMyReservations(studentId: string) {
    return prisma.bookReservation.findMany({
      where: { studentId },
      include: { book: true },
      orderBy: { reservedAt: 'desc' },
    });
  }

  // Blocks a duplicate PENDING request (unique constraint backs this too,
  // but this gives a clearer error message than a raw DB conflict).
  async requestClearance(studentId: string) {
    const existing = await prisma.libraryClearance.findFirst({
      where: { studentId, status: 'PENDING' },
    });
    if (existing) throw new BadRequestException('You already have a pending clearance request');

    return prisma.libraryClearance.create({ data: { studentId, status: 'PENDING' } });
  }

  listPendingClearances() {
    return prisma.libraryClearance.findMany({
      where: { status: 'PENDING' },
      include: { student: { include: { user: { select: { email: true } } } } },
      orderBy: { requestedAt: 'asc' },
    });
  }

  resolveClearance(id: string, dto: ResolveClearanceDto) {
    return prisma.libraryClearance.update({
      where: { id },
      data: { status: dto.status, remarks: dto.remarks, resolvedAt: new Date() },
    });
  }
}
