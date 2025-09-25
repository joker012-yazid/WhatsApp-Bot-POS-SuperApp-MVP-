import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './common/prisma.service';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { ChatModule } from './chat/chat.module';
import { TicketsModule } from './tickets/tickets.module';
import { PosModule } from './pos/pos.module';
import { FilesModule } from './files/files.module';
import { HealthModule } from './health/health.module';
import { CacheModule } from './common/cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'login',
        ttl: Number(process.env.RATE_LIMIT_WINDOW ?? 60000),
        limit: Number(process.env.RATE_LIMIT_MAX ?? 5)
      }
    ]),
    AuthModule,
    CustomersModule,
    ChatModule,
    TicketsModule,
    PosModule,
    FilesModule,
    HealthModule,
    CacheModule
  ],
  providers: [PrismaService]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
