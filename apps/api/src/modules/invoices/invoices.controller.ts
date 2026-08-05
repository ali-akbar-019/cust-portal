import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

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
  listForStudent(@Param('studentId') studentId: string) {
    return this.invoicesService.listForStudent(studentId);
  }

  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @Post(':id/pay')
  pay(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invoicesService.pay(id, user.sub);
  }
}
