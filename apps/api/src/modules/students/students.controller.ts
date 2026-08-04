import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // TODO: once req.user is wired here, restrict a STUDENT role to only
    // fetching their own id (compare req.user.sub's linked studentId)
    return this.studentsService.findById(id);
  }

  @Get(':id/timetable')
  getTimetable(@Param('id') id: string) {
    return this.studentsService.getTimetable(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }
}
