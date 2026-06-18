import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
  type CreateSupportGrantInput,
  type PermissionKey,
  type SupportScope,
} from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from '../auth/token.service';

/** read_only drops the most sensitive capabilities; full == gym owner. */
const SENSITIVE: PermissionKey[] = [
  PERMISSIONS.PAYMENTS_REFUND,
  PERMISSIONS.RECORDS_HARD_DELETE,
  PERMISSIONS.STAFF_MANAGE,
  PERMISSIONS.GYM_SETTINGS,
];

/** A single support-session token lives at most this long; re-redeem to extend. */
const MAX_SESSION_SECONDS = 2 * 60 * 60;

/** Unambiguous alphabet (no 0/O/1/I) so owners can read codes aloud. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

interface GrantRow {
  id: string;
  gymId: string;
  code: string;
  scope: string;
  reason: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  redeemedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class SupportAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  private permsForScope(scope: SupportScope): PermissionKey[] {
    const base = ROLE_PERMISSIONS[ROLES.GYM_OWNER];
    return scope === 'read_only' ? base.filter((p) => !SENSITIVE.includes(p)) : base;
  }

  private genCode(): string {
    const bytes = randomBytes(15);
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
      if (i % 5 === 4 && i < bytes.length - 1) out += '-';
    }
    return `SUP-${out}`;
  }

  private status(g: Pick<GrantRow, 'revokedAt' | 'expiresAt' | 'redeemedAt'>): string {
    if (g.revokedAt) return 'revoked';
    if (g.expiresAt.getTime() <= Date.now()) return 'expired';
    if (g.redeemedAt) return 'active';
    return 'pending';
  }

  private shape(g: GrantRow, opts: { includeCode?: boolean } = {}) {
    return {
      id: g.id,
      gymId: g.gymId,
      scope: g.scope,
      reason: g.reason,
      status: this.status(g),
      expiresAt: g.expiresAt,
      revokedAt: g.revokedAt,
      redeemedAt: g.redeemedAt,
      lastUsedAt: g.lastUsedAt,
      createdAt: g.createdAt,
      ...(opts.includeCode ? { code: g.code } : {}),
    };
  }

  // ── Tenant (gym owner) ──────────────────────────────────────────────────
  async mint(gymId: string, userId: string, dto: CreateSupportGrantInput) {
    const expiresAt = new Date(Date.now() + dto.durationHours * 3600 * 1000);
    const grant = await this.prisma.supportGrant.create({
      data: {
        gymId,
        code: this.genCode(),
        scope: dto.scope,
        reason: dto.reason ?? null,
        createdById: userId,
        expiresAt,
      },
    });
    await this.audit(gymId, userId, 'support.granted', grant.id, {
      scope: dto.scope,
      expiresAt: expiresAt.toISOString(),
    });
    // The only time the code is ever returned in full.
    return this.shape(grant, { includeCode: true });
  }

  async list(gymId: string) {
    const grants = await this.prisma.supportGrant.findMany({
      where: { gymId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return grants.map((g) => this.shape(g));
  }

  async revoke(gymId: string, id: string, userId: string) {
    const grant = await this.prisma.supportGrant.findFirst({ where: { id, gymId } });
    if (!grant) throw new NotFoundException('Grant not found');
    if (grant.revokedAt) return this.shape(grant);
    const updated = await this.prisma.supportGrant.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    await this.audit(gymId, userId, 'support.revoked', id, { scope: grant.scope });
    return this.shape(updated);
  }

  // ── Platform operator ───────────────────────────────────────────────────
  /** Live (not revoked/expired) support windows across every gym. */
  async requests() {
    const grants = await this.prisma.supportGrant.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      include: { gym: { select: { id: true, name: true, slug: true } } },
      take: 100,
    });
    return grants.map((g) => ({ ...this.shape(g), gym: g.gym }));
  }

  async redeem(code: string, operatorId: string) {
    const grant = await this.prisma.supportGrant.findUnique({
      where: { code: code.trim() },
      include: { gym: { select: { id: true, name: true, slug: true } } },
    });
    if (!grant) throw new NotFoundException('Invalid support code');
    if (grant.revokedAt) throw new BadRequestException('This support access was revoked by the gym');
    const remainingMs = grant.expiresAt.getTime() - Date.now();
    if (remainingMs <= 0) throw new BadRequestException('This support access has expired');

    const scope = grant.scope as SupportScope;
    const permissions = this.permsForScope(scope);
    const ttl = Math.min(MAX_SESSION_SECONDS, Math.floor(remainingMs / 1000));
    const accessToken = await this.tokens.issueSupportToken(
      { sub: operatorId, gymId: grant.gymId, roles: [], permissions, support: true, supportGrantId: grant.id },
      ttl,
    );

    const now = new Date();
    await this.prisma.supportGrant.update({
      where: { id: grant.id },
      data: { redeemedAt: grant.redeemedAt ?? now, redeemedById: operatorId, lastUsedAt: now },
    });
    await this.audit(grant.gymId, operatorId, 'support.redeemed', grant.id, { scope });

    return {
      accessToken,
      expiresAt: new Date(now.getTime() + ttl * 1000),
      grantExpiresAt: grant.expiresAt,
      scope,
      permissions,
      gym: grant.gym,
    };
  }

  private async audit(
    gymId: string,
    actorUserId: string,
    action: string,
    grantId: string,
    after: Record<string, string>,
  ) {
    await this.prisma.auditLog.create({
      data: { gymId, actorUserId, action, entityType: 'support_grant', entityId: grantId, after },
    });
  }
}
