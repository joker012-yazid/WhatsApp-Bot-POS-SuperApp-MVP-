import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { TicketStatus, Ticket } from '@prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TransitionTicketDto } from './dto/transition-ticket.dto';
import { DateTime } from 'luxon';
import { CacheService } from '../common/cache.service';

const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.OPEN, TicketStatus.RESOLVED],
  [TicketStatus.RESOLVED]: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
  [TicketStatus.CLOSED]: []
};

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService
  ) {}

  private withSla<T extends Ticket>(ticket: T) {
    const priority = ticket.priority ?? 3;
    const hours = priority <= 1 ? 4 : priority === 2 ? 8 : priority === 3 ? 24 : 48;
    const created = DateTime.fromJSDate(ticket.createdAt, { zone: 'Asia/Kuala_Lumpur' });
    const due = created.plus({ hours });
    return {
      ...ticket,
      slaDueAt: due.toISO()
    };
  }

  async get(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { customer: true, assignee: true }
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return this.withSla(ticket);
  }

  async listTickets(status?: TicketStatus) {
    if (status === TicketStatus.OPEN) {
      const cacheKey = 'tickets:status:OPEN';
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
      const tickets = await this.prisma.ticket.findMany({
        where: { status },
        include: { customer: true, assignee: true },
        orderBy: { createdAt: 'desc' }
      });
      const payload = tickets.map((ticket: Ticket) => this.withSla(ticket));
      await this.cache.set(cacheKey, payload, 60);
      return payload;
    }

    const tickets = await this.prisma.ticket.findMany({
      where: status ? { status } : {},
      include: { customer: true, assignee: true },
      orderBy: { createdAt: 'desc' }
    });
    return tickets.map((ticket: Ticket) => this.withSla(ticket));
  }

  async stats() {
    const [total, open, inProgress] = await Promise.all([
      this.prisma.ticket.count(),
      this.prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
      this.prisma.ticket.count({ where: { status: TicketStatus.IN_PROGRESS } })
    ]);
    return { total, open, inProgress };
  }

  async create(dto: CreateTicketDto) {
    const ticket = await this.prisma.ticket.create({
      data: {
        customerId: dto.customerId,
        waSessionId: dto.waSessionId,
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority ?? 3,
        assigneeId: dto.assigneeId,
        status: dto.status ?? TicketStatus.OPEN
      }
    });
    await this.invalidateOpenTicketCache();
    return this.get(ticket.id);
  }

  async update(id: string, dto: UpdateTicketDto) {
    await this.get(id);
    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority,
        assigneeId: dto.assigneeId,
        status: dto.status
      }
    });
    await this.invalidateOpenTicketCache();
    return this.withSla(ticket);
  }

  async transition(id: string, dto: TransitionTicketDto) {
    const ticket = (await this.prisma.ticket.findUnique({ where: { id } })) as Ticket | null;
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    const allowed = TRANSITIONS[ticket.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`Transition from ${ticket.status} to ${dto.status} not allowed`);
    }
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { status: dto.status }
    });
    await this.invalidateOpenTicketCache();
    return this.withSla(updated);
  }

  private async invalidateOpenTicketCache() {
    await this.cache.del('tickets:status:OPEN');
  }
}
