import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @Post()
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.create(user.sub, dto);
  }

  @Get()
  findForRecipient(@Query('departmentId') departmentId?: string, @Query('sectionId') sectionId?: string) {
    // TODO: once req.user carries the caller's own department/section,
    // derive these server-side instead of trusting client-supplied query params
    return this.notificationsService.findForRecipient(departmentId, sectionId);
  }
}
