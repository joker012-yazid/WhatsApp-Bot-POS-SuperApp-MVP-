import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { BootstrapDto } from './dto/bootstrap.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/prisma.enums';
import { TotpTokenDto } from './dto/totp-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('bootstrap')
  async bootstrap(@Body() dto: BootstrapDto) {
    return this.authService.bootstrap(dto);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ name: 'login' })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: any) {
    return user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('totp/setup')
  async requestTotp(@CurrentUser() user: any) {
    return this.authService.requestTotpSetup(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('totp/verify')
  async verifyTotp(@CurrentUser() user: any, @Body() dto: TotpTokenDto) {
    return this.authService.enableTotp(user.id, dto.token);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('totp')
  async disableTotp(@CurrentUser() user: any) {
    return this.authService.disableTotp(user.id);
  }
}
