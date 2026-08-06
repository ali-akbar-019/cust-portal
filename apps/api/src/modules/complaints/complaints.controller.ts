import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @Post()
  create(@Body() dto: CreateComplaintDto, @CurrentUser() user: AuthenticatedUser) {
    return this.complaintsService.create(user.sub, dto);
  }

  @Get('mine/:studentId')
  listMine(@Param('studentId') studentId: string) {
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
