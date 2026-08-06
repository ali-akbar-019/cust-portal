import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { ResolveRequestDto } from './dto/resolve-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ensureOwnStudentOrElevated } from '../../common/guards/self-or-elevated.util';
import { resolveStudentId } from '../../common/guards/resolve-student-id.util';

@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @Post()
  async create(@Body() dto: CreateRequestDto, @CurrentUser() user: AuthenticatedUser) {
    const studentId = await resolveStudentId(user);
    return this.requestsService.create(studentId, dto);
  }

  @Get('mine/:studentId')
  async listMine(@Param('studentId') studentId: string, @CurrentUser() user: AuthenticatedUser) {
    await ensureOwnStudentOrElevated(user, studentId);
    return this.requestsService.listMine(studentId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get()
  listAll() {
    return this.requestsService.listAll();
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  resolve(@Param('id') id: string, @Body() dto: ResolveRequestDto) {
    return this.requestsService.resolve(id, dto);
  }
}
