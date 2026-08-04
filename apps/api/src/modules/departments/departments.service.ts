import { Injectable } from '@nestjs/common';
import { prisma } from '@cust/database';

@Injectable()
export class DepartmentsService {
  findAll() {
    return prisma.department.findMany({ orderBy: { name: 'asc' } });
  }
}
