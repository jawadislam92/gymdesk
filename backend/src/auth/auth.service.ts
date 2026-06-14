import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ROLES, type LoginInput, type PermissionKey, type RegisterInput, type RoleName } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  /** Owner self-registration: create the user + their first gym, assign gym_owner. */
  async register(dto: RegisterInput) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const ownerRole = await this.prisma.role.findFirst({
      where: { name: ROLES.GYM_OWNER, gymId: null, isSystem: true },
    });
    if (!ownerRole) {
      throw new InternalServerErrorException('System roles are not seeded — run `pnpm db:seed`.');
    }

    const passwordHash = await this.passwords.hash(dto.password);
    const slug = await this.uniqueSlug(dto.gymName);

    const user = await this.prisma.$transaction(async (tx) => {
      const gym = await tx.gym.create({ data: { name: dto.gymName, slug } });
      const created = await tx.user.create({
        data: { email: dto.email, passwordHash, fullName: dto.fullName, gymId: gym.id },
      });
      await tx.gym.update({ where: { id: gym.id }, data: { ownerUserId: created.id } });
      await tx.userRole.create({
        data: { userId: created.id, roleId: ownerRole.id, gymId: gym.id },
      });
      return created;
    });

    return this.issueFor(user.id);
  }

  async login(dto: LoginInput) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await this.passwords.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueFor(user.id);
  }

  /** Rotating refresh: revoke the presented token, issue a fresh pair. */
  async refresh(refreshToken: string) {
    const { sub, jti } = await this.tokens.verifyRefresh(refreshToken);
    await this.tokens.revoke(sub, jti);
    return this.issueFor(sub);
  }

  async logout(userId: string): Promise<void> {
    await this.tokens.revokeAll(userId);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        gymId: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    const { roles, permissions } = await this.loadRolesAndPermissions(userId);
    return { ...user, roles, permissions };
  }

  private async issueFor(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const { roles, permissions } = await this.loadRolesAndPermissions(userId);
    const tokens = await this.tokens.issueTokens({
      sub: user.id,
      gymId: user.gymId,
      roles,
      permissions,
    });
    return {
      ...tokens,
      user: { id: user.id, email: user.email, fullName: user.fullName, gymId: user.gymId, roles },
    };
  }

  private async loadRolesAndPermissions(
    userId: string,
  ): Promise<{ roles: RoleName[]; permissions: PermissionKey[] }> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    const roles = userRoles.map((ur) => ur.role.name as RoleName);
    const permissions = new Set<PermissionKey>();
    for (const ur of userRoles) {
      for (const p of (ur.role.permissions as PermissionKey[]) ?? []) permissions.add(p);
    }
    return { roles, permissions: [...permissions] };
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'gym';
    let slug = base;
    let n = 1;
    while (await this.prisma.gym.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }
    return slug;
  }
}
