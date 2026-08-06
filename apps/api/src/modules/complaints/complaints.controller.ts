import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ensureOwnStudentOrElevated } from '../../common/guards/self-or-elevated.util';
import { resolveStudentId } from '../../common/guards/resolve-student-id.util';

@UseGuards(JwtAuthGuard)
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @Post()
  async create(@Body() dto: CreateComplaintDto, @CurrentUser() user: AuthenticatedUser) {
    const studentId = await resolveStudentId(user);
    return this.complaintsService.create(studentId, dto);
  }

  @Get('mine/:studentId')
  async listMine(@Param('studentId') studentId: string, @CurrentUser() user: AuthenticatedUser) {
    await ensureOwnStudentOrElevated(user, studentId);
    return this.complaintsService.listMine(studentId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get()
  listAll() {
    return this.complaintsService.listAll();
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateComplaintDto) {
    return this.complaintsService.update(id, dto);
  }
}
