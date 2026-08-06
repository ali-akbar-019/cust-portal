import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { LibraryService } from './library.service';
import { ReserveBookDto } from './dto/reserve-book.dto';
import { ResolveClearanceDto } from './dto/resolve-clearance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ensureOwnStudentOrElevated } from '../../common/guards/self-or-elevated.util';
import { resolveStudentId } from '../../common/guards/resolve-student-id.util';

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
  async reserve(@Body() dto: ReserveBookDto, @CurrentUser() user: AuthenticatedUser) {
    const studentId = await resolveStudentId(user);
    return this.libraryService.reserveBook(studentId, dto.bookId);
  }

  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @Post('reservations/:id/cancel')
  async cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const studentId = await resolveStudentId(user);
    return this.libraryService.cancelReservation(id, studentId);
  }

  @Get('reservations/mine/:studentId')
  async listMine(@Param('studentId') studentId: string, @CurrentUser() user: AuthenticatedUser) {
    await ensureOwnStudentOrElevated(user, studentId);
    return this.libraryService.listMyReservations(studentId);
  }

  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  @Post('clearance')
  async requestClearance(@CurrentUser() user: AuthenticatedUser) {
    const studentId = await resolveStudentId(user);
    return this.libraryService.requestClearance(studentId);
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
