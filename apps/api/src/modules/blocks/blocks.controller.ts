import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { BlocksService } from './blocks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('blocks')
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  // Anyone authenticated can view blocks/rooms (needed to render timetables)
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.blocksService.findAllWithFloorsAndRooms();
  }

  // Only admins can create/edit blocks, floors, rooms
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() body: { name: string }) {
    return this.blocksService.create(body.name);
  }
}
