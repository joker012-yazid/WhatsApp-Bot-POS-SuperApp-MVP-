import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { WebhookDto } from './dto/webhook.dto';
import { WaMessageDirection } from '../common/constants/prisma.enums';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  listSessions() {
    return this.prisma.waSession.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { branch: true }
    });
  }

  listMessages(sessionId: string) {
    return this.prisma.waMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }

  private async ensureSession(sessionId: string) {
    return this.prisma.waSession.upsert({
      where: { id: sessionId },
      update: {},
      create: {
        id: sessionId,
        label: sessionId
      }
    });
  }

  async recordMessage(dto: CreateMessageDto) {
    await this.ensureSession(dto.sessionId);
    return this.prisma.waMessage.create({
      data: {
        sessionId: dto.sessionId,
        direction: dto.direction,
        payload: dto.payload
      }
    });
  }

  async sendMessage(sessionId: string, payload: Record<string, unknown>) {
    return this.recordMessage({
      sessionId,
      direction: WaMessageDirection.OUTBOUND,
      payload
    });
  }

  async ingestWebhook(dto: WebhookDto) {
    for (const message of dto.messages) {
      await this.recordMessage(message);
    }
    return { received: dto.messages.length };
  }
}
