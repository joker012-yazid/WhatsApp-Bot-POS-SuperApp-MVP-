import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaService } from '../common/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [ChatController],
  providers: [ChatService, PrismaService, RolesGuard]
})
export class ChatModule {}
