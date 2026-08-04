import { Injectable } from '@nestjs/common';
import { prisma } from '@cust/database';

@Injectable()
export class BlocksService {
  findAllWithFloorsAndRooms() {
    return prisma.block.findMany({
      include: { floors: { include: { rooms: true } } },
      orderBy: { name: 'asc' },
    });
  }

  create(name: string) {
    return prisma.block.create({ data: { name } });
  }
}
