import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@cust/database';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoicesService {
  create(dto: CreateInvoiceDto) {
    return prisma.invoice.create({
      data: {
        studentId: dto.studentId,
        description: dto.description,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
      },
    });
  }

  // Lazily flips PENDING -> OVERDUE on read rather than needing a cron job
  // for v1 — good enough since the status is only ever surfaced through
  // this read path. A scheduled job (BullMQ) would be the v2 upgrade if
  // overdue status needs to trigger something proactive (e.g. an email).
  async listForStudent(studentId: string) {
    const invoices = await prisma.invoice.findMany({
      where: { studentId },
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();
    const withComputedStatus = await Promise.all(
      invoices.map(async (inv) => {
        if (inv.status === 'PENDING' && inv.dueDate < now) {
          return prisma.invoice.update({ where: { id: inv.id }, data: { status: 'OVERDUE' } });
        }
        return inv;
      }),
    );
    return withComputedStatus;
  }

  async pay(invoiceId: string, studentId: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice || invoice.studentId !== studentId) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'PAID') throw new BadRequestException('Invoice already paid');

    // NOTE: this just marks the invoice paid — there's no real payment
    // gateway wired up. A production version would integrate a payment
    // processor here and only mark PAID on a confirmed webhook, not on
    // the client's say-so.
    return prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }
}
