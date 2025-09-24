import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../common/prisma.service';
import { JwtStrategy } from './jwt.strategy';
import { readSecret } from '../common/secret.util';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: readSecret('JWT_SECRET', { fallback: 'change-me' })
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtStrategy, RolesGuard],
  exports: [JwtModule, PassportModule]
})
export class AuthModule {}
