import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { TicketStatus } from '../common/constants/prisma.enums';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TransitionTicketDto } from './dto/transition-ticket.dto';
import { DateTime } from 'luxon';
import { RedisCacheService } from '../common/cache/redis-cache.service';

type TicketEntity = {
  id: string;
  status: TicketStatus;
  priority: number | null;
  createdAt: Date;
  [key: string]: any;
};

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
    private readonly cache: RedisCacheService
  ) {}

  private withSla<T extends TicketEntity>(ticket: T) {
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
    const ticket = (await this.prisma.ticket.findUnique({
      where: { id },
      include: { customer: true, assignee: true }
    })) as TicketEntity | null;
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return this.withSla(ticket);
  }

  async listTickets(status?: TicketStatus) {
    const cacheKey = status === TicketStatus.OPEN ? 'tickets:status:OPEN' : undefined;
    if (cacheKey) {
      const cached = await this.cache.get<any[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const tickets = (await this.prisma.ticket.findMany({
      where: status ? { status } : {},
      include: { customer: true, assignee: true },
      orderBy: { createdAt: 'desc' }
    })) as TicketEntity[];
    const withSla = tickets.map((ticket) => this.withSla(ticket));

    if (cacheKey) {
      await this.cache.set(cacheKey, withSla, 60);
    }

    return withSla;
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
    const result = await this.get(ticket.id);
    await this.cache.del('tickets:status:OPEN');
    return result;
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
    const result = this.withSla(ticket);
    await this.cache.del('tickets:status:OPEN');
    return result;
  }

  async transition(id: string, dto: TransitionTicketDto) {
    const ticket = (await this.prisma.ticket.findUnique({ where: { id } })) as TicketEntity | null;
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
    const result = this.withSla(updated);
    await this.cache.del('tickets:status:OPEN');
    return result;
  }
}
