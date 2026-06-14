import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { type InviteStaffInput, ROLES } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  /** Invite a staff member / trainer: create the user, assign the role, and the
   *  matching profile row (Staff or Trainer). They can log in immediately. */
  async invite(gymId: string, dto: InviteStaffInput) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const role = await this.prisma.role.findFirst({
      where: { name: dto.role, gymId: null, isSystem: true },
    });
    if (!role) throw new InternalServerErrorException('System roles are not seeded');

    const passwordHash = await this.passwords.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          gymId,
          email: dto.email,
          fullName: dto.fullName,
          passwordHash,
          emailVerifiedAt: new Date(),
        },
      });
      await tx.userRole.create({ data: { userId: user.id, roleId: role.id, gymId } });
      if (dto.role === ROLES.TRAINER) {
        await tx.trainer.create({ data: { gymId, userId: user.id } });
      } else {
        await tx.staff.create({ data: { gymId, userId: user.id, position: dto.role } });
      }
      return { id: user.id, email: user.email, fullName: user.fullName, role: dto.role };
    });
  }

  /** The gym's team: everyone holding a non-member role. */
  async list(gymId: string) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { gymId, role: { name: { not: ROLES.MEMBER } } },
      include: {
        user: { select: { id: true, fullName: true, email: true, isActive: true, lastLoginAt: true } },
        role: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const team = new Map<
      string,
      {
        id: string;
        fullName: string;
        email: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        roles: string[];
      }
    >();
    for (const ur of userRoles) {
      if (!ur.user) continue;
      const entry = team.get(ur.user.id) ?? { ...ur.user, roles: [] };
      entry.roles.push(ur.role.name);
      team.set(ur.user.id, entry);
    }
    return [...team.values()];
  }

  async deactivate(gymId: string, userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, gymId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    return { success: true };
  }
}
