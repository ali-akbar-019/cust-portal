import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ensureOwnStudentOrElevated } from '../../common/guards/self-or-elevated.util';
import { resolveStudentId } from '../../common/guards/resolve-student-id.util';

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto);
  }

  @Get('student/:studentId')
  async listForStudent(@Param('studentId') studentId: string, @CurrentUser() user: AuthenticatedUser) {
    await ensureOwnStudentOrElevated(user, studentId);
    return this.invoicesService.listForStudent(studentId);
  }

  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @Post(':id/pay')
  async pay(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const studentId = await resolveStudentId(user);
    return this.invoicesService.pay(id, studentId);
  }
}
