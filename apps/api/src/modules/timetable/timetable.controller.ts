import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { TimetableGeneratorService } from './generator/timetable-generator.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('timetable')
export class TimetableController {
  constructor(
    private readonly timetableService: TimetableService,
    private readonly generatorService: TimetableGeneratorService,
  ) {}

  @Get('section/:sectionId')
  getSectionTimetable(@Param('sectionId') sectionId: string) {
    return this.timetableService.getStudentTimetable(sectionId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('slots')
  async createSlot(@Body() dto: CreateSlotDto) {
    // TODO: derive teacherId server-side from dto.sectionId instead of
    // trusting a client-supplied teacherId, once Section lookups are wired here
    return this.timetableService.createSlot(dto as any);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('generate')
  generateTimetable(@Query('departmentId') departmentId: string) {
    return this.generatorService.generate(departmentId);
  }
}
