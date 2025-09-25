import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SendMessageDto } from './dto/send-message.dto';
import { WebhookDto } from './dto/webhook.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('sessions')
  listSessions() {
    return this.chatService.listSessions();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('sessions/:id/messages')
  listMessages(@Param('id') id: string) {
    return this.chatService.listMessages(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('sessions/:id/messages')
  sendMessage(@Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(id, dto.payload);
  }

  @Post('webhook/internal')
  ingest(@Body() dto: WebhookDto, @Headers('x-internal-token') token?: string) {
    const expected = process.env.BAILEYS_WEBHOOK_TOKEN;
    if (expected && token !== expected) {
      throw new UnauthorizedException('Invalid webhook token');
    }
    return this.chatService.ingestWebhook(dto);
  }
}
