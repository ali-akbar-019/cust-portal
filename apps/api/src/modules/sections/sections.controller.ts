import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SectionsService } from './sections.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get()
  findByDepartment(@Query('departmentId') departmentId: string) {
    return this.sectionsService.findByDepartment(departmentId);
  }
}
