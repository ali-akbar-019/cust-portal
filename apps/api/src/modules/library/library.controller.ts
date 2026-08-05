import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { LibraryService } from './library.service';
import { ReserveBookDto } from './dto/reserve-book.dto';
import { ResolveClearanceDto } from './dto/resolve-clearance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get('books')
  findAllBooks() {
    return this.libraryService.findAllBooks();
  }

  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @Post('reservations')
  reserve(@Body() dto: ReserveBookDto, @CurrentUser() user: AuthenticatedUser) {
    return this.libraryService.reserveBook(user.sub, dto.bookId);
  }

  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @Post('reservations/:id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.libraryService.cancelReservation(id, user.sub);
  }

  @Get('reservations/mine/:studentId')
  listMine(@Param('studentId') studentId: string) {
    return this.libraryService.listMyReservations(studentId);
  }

  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @Post('clearance')
  requestClearance(@CurrentUser() user: AuthenticatedUser) {
    return this.libraryService.requestClearance(user.sub);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('clearance/pending')
  listPending() {
    return this.libraryService.listPendingClearances();
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('clearance/:id/resolve')
  resolveClearance(@Param('id') id: string, @Body() dto: ResolveClearanceDto) {
    return this.libraryService.resolveClearance(id, dto);
  }
}
