import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { BootstrapDto } from './dto/bootstrap.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { authenticator } from 'otplib';
import { readSecret } from '../common/secret.util';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/;
const PASSWORD_POLICY_MSG =
  'Password must be at least 12 characters and include uppercase, lowercase, numeric, and symbol characters.';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService) {}

  private enforcePasswordPolicy(password: string) {
    if (!PASSWORD_POLICY.test(password)) {
      throw new ForbiddenException(PASSWORD_POLICY_MSG);
    }
  }

  private getJwtSecret() {
    return readSecret('JWT_SECRET', { fallback: 'change-me' }) ?? 'change-me';
  }

  private getRefreshSecret(defaultSecret: string) {
    return readSecret('JWT_REFRESH_SECRET', { fallback: defaultSecret }) ?? defaultSecret;
  }

  private async signTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const secret = this.getJwtSecret();
    const refreshSecret = this.getRefreshSecret(secret);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { secret, expiresIn: ACCESS_TOKEN_TTL }),
      this.jwtService.signAsync(payload, { secret: refreshSecret, expiresIn: REFRESH_TOKEN_TTL })
    ]);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: User) {
    const { passwordHash: _passwordHash, totpSecret: _totpSecret, ...safe } = user;
    return safe;
  }

  private async verifyRecaptcha(token: string) {
    if (!token) {
      throw new UnauthorizedException('reCAPTCHA token is required');
    }
    const secret = readSecret('RECAPTCHA_SECRET');
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException('reCAPTCHA is not configured');
      }
      return;
    }
    const params = new URLSearchParams({ secret, response: token });
    let payload: any;
    try {
      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        body: params
      });
      payload = await response.json();
    } catch (error) {
      throw new UnauthorizedException('reCAPTCHA verification failed');
    }
    if (!payload?.success) {
      throw new UnauthorizedException('Failed human verification');
    }
  }

  private ensureAdminTotp(user: User, token?: string) {
    if (user.role !== Role.ADMIN || !user.totpEnabled) {
      return;
    }
    if (!user.totpSecret) {
      throw new UnauthorizedException('TOTP not configured correctly');
    }
    if (!token) {
      throw new UnauthorizedException('TOTP code required');
    }
    const valid = authenticator.verify({ token, secret: user.totpSecret });
    if (!valid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }
  }

  async bootstrap(dto: BootstrapDto) {
    const existingUsers = await this.prisma.user.count();
    if (existingUsers > 0) {
      throw new ForbiddenException('Bootstrap already completed');
    }
    this.enforcePasswordPolicy(dto.password);
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        fullName: dto.fullName,
        passwordHash,
        role: Role.ADMIN
      }
    });

    const tokens = await this.signTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    await this.verifyRecaptcha(dto.recaptchaToken);
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.ensureAdminTotp(user, dto.totpCode);

    const tokens = await this.signTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refresh(dto: RefreshDto) {
    const secret = this.getRefreshSecret(this.getJwtSecret());
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, { secret });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const tokens = await this.signTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async requestTotpSetup(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators may configure TOTP');
    }
    const secret = authenticator.generateSecret();
    const issuer = process.env.TOTP_ISSUER || 'SPEC-1 SuperApp';
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret, totpEnabled: false }
    });
    return {
      secret,
      otpauthUrl: authenticator.keyuri(user.email, issuer, secret)
    };
  }

  async enableTotp(userId: string, token: string) {
    if (!token) {
      throw new BadRequestException('TOTP token is required');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators may enable TOTP');
    }
    if (!user.totpSecret) {
      throw new BadRequestException('TOTP setup not initiated');
    }
    const valid = authenticator.verify({ token, secret: user.totpSecret });
    if (!valid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: true }
    });
    return { enabled: true };
  }

  async disableTotp(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators may disable TOTP');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: false, totpSecret: null }
    });
    return { enabled: false };
  }
}
