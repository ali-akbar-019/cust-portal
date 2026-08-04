import { Injectable } from '@nestjs/common';
import { prisma } from '@cust/database';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  findAll() {
    // never return passwordHash to the client
    return prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true },
    });
  }

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, createdAt: true },
    });
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await AuthService.hashPassword(dto.password);
    return prisma.user.create({
      data: { email: dto.email, passwordHash, role: dto.role },
      select: { id: true, email: true, role: true, createdAt: true },
    });
  }
}
