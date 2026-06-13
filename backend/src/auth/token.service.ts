import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { RedisService } from '../redis/redis.service';
import type { AccessTokenPayload, RefreshTokenPayload } from './types/auth-user';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

/** Issues/verifies JWTs and tracks refresh tokens in Redis so they're revocable. */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
  ) {}

  async issueTokens(payload: AccessTokenPayload): Promise<IssuedTokens> {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_TTL ?? '15m',
    } as JwtSignOptions);

    const jti = randomUUID();
    const refreshToken = await this.jwt.signAsync({ sub: payload.sub, jti } satisfies RefreshTokenPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_TTL ?? '30d',
    } as JwtSignOptions);
    await this.redis.client.set(
      this.key(payload.sub, jti),
      '1',
      'EX',
      durationToSeconds(process.env.JWT_REFRESH_TTL ?? '30d'),
    );

    return { accessToken, refreshToken };
  }

  async verifyRefresh(token: string): Promise<RefreshTokenPayload> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const exists = await this.redis.client.exists(this.key(payload.sub, payload.jti));
    if (!exists) throw new UnauthorizedException('Refresh token has been revoked');
    return payload;
  }

  async revoke(userId: string, jti: string): Promise<void> {
    await this.redis.client.del(this.key(userId, jti));
  }

  async revokeAll(userId: string): Promise<void> {
    const keys = await this.redis.client.keys(this.key(userId, '*'));
    if (keys.length) await this.redis.client.del(...keys);
  }

  private key(userId: string, jti: string): string {
    return `refresh:${userId}:${jti}`;
  }
}

/** Parse a duration like "15m" / "30d" / "3600" into seconds. */
function durationToSeconds(value: string): number {
  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
  if (!match) return 60 * 60 * 24 * 30;
  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * (multipliers[unit] ?? 1);
}
