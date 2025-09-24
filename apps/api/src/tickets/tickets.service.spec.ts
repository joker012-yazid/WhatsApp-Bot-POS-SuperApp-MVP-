import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../common/prisma.service';
import { TicketStatus } from '@prisma/client';
import { DateTime } from 'luxon';

describe('TicketsService', () => {
  let service: TicketsService;
  const prisma = {
    ticket: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn()
    }
  } as unknown as PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TicketsService, { provide: PrismaService, useValue: prisma }]
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    jest.clearAllMocks();
  });

  it('should filter tickets by status when provided', async () => {
    const createdAt = new Date();
    (prisma.ticket.findMany as jest.Mock).mockResolvedValue([
      { id: '1', status: TicketStatus.OPEN, priority: 3, createdAt }
    ]);

    const result = await service.listTickets(TicketStatus.OPEN);

    expect(prisma.ticket.findMany).toHaveBeenCalledWith({
      where: { status: TicketStatus.OPEN },
      include: { customer: true, assignee: true },
      orderBy: { createdAt: 'desc' }
    });
    expect(result[0].slaDueAt).toBeDefined();
  });

  it('should block invalid status transitions', async () => {
    const ticket = { id: '1', status: TicketStatus.CLOSED, createdAt: new Date(), priority: 3 };
    (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(ticket);

    await expect(
      service.transition('1', { status: TicketStatus.OPEN })
    ).rejects.toThrowError();
  });

  it('should compute SLA due time in MYT', async () => {
    const createdAt = DateTime.fromISO('2024-04-01T00:00:00').toJSDate();
    (prisma.ticket.findUnique as jest.Mock).mockResolvedValue({
      id: '1',
      status: TicketStatus.OPEN,
      priority: 1,
      createdAt
    });

    const result = await service.get('1');
    expect(result.slaDueAt).toBe(DateTime.fromJSDate(createdAt, { zone: 'Asia/Kuala_Lumpur' }).plus({ hours: 4 }).toISO());
  });
});
