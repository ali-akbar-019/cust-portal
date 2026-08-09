import { Injectable } from '@nestjs/common';
import { prisma } from '@cust/database';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentsService {
  findAll() {
    return prisma.department.findMany({ orderBy: { name: 'asc' } });
  }

  create(dto: CreateDepartmentDto) {
    return prisma.department.create({ data: dto });
  }
}
