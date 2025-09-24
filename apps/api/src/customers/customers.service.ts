import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.customer.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async get(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  async matchByPhone(phone: string) {
    return this.prisma.customer.findUnique({ where: { phone } });
  }

  async create(dto: CreateCustomerDto) {
    const existing = await this.matchByPhone(dto.phone);
    if (existing) {
      return this.prisma.customer.update({
        where: { id: existing.id },
        data: {
          fullName: dto.fullName ?? existing.fullName,
          email: dto.email ?? existing.email,
          tags: dto.tags ?? existing.tags
        }
      });
    }
    return this.prisma.customer.create({
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        tags: dto.tags
      }
    });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.get(id);
    if (dto.phone) {
      const conflict = await this.matchByPhone(dto.phone);
      if (conflict && conflict.id !== id) {
        throw new ConflictException('Phone number already assigned');
      }
    }
    return this.prisma.customer.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        tags: dto.tags
      }
    });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.ticket.updateMany({ where: { customerId: id }, data: { customerId: null } });
    await this.prisma.sale.updateMany({ where: { customerId: id }, data: { customerId: null } });
    return this.prisma.customer.delete({ where: { id } });
  }
}
