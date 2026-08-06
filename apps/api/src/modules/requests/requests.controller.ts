import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { ResolveRequestDto } from './dto/resolve-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @Post()
  create(@Body() dto: CreateRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.requestsService.create(user.sub, dto);
  }

  @Get('mine/:studentId')
  listMine(@Param('studentId') studentId: string) {
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
