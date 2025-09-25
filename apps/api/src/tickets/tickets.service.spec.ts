import { TicketsService } from './tickets.service';
import { PrismaService } from '../common/prisma.service';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { TicketStatus } from '../common/constants/prisma.enums';
import { DateTime } from 'luxon';

jest.mock('ioredis', () => {
  const mockInstance = {
    on: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn()
  };
  const RedisMock = jest.fn(() => mockInstance);
  return Object.assign(RedisMock, { __esModule: true, default: RedisMock });
}, { virtual: true });

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
  const cache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
  } as unknown as RedisCacheService;

  beforeEach(() => {
    service = new TicketsService(prisma, cache);
    jest.clearAllMocks();
    (cache.get as jest.Mock).mockResolvedValue(null);
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
