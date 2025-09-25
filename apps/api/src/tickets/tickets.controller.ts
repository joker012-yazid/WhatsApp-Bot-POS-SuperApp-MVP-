import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketStatus, Role } from '../common/constants/prisma.enums';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TransitionTicketDto } from './dto/transition-ticket.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  list(@Query('status') status?: TicketStatus) {
    return this.ticketsService.listTickets(status);
  }

  @Get('stats')
  stats() {
    return this.ticketsService.stats();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.ticketsService.get(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.AGENT)
  @Post()
  create(@Body() dto: CreateTicketDto) {
    return this.ticketsService.create(dto);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.update(id, dto);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post(':id/transition')
  transition(@Param('id') id: string, @Body() dto: TransitionTicketDto) {
    return this.ticketsService.transition(id, dto);
  }
}
