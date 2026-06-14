import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type PlatformCreateGymInput, ROLES, type UpdateSubscriptionInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async overview() {
    const [totalGyms, totalMembers, revenue, activeGyms] = await this.prisma.$transaction([
      this.prisma.gym.count({ where: { deletedAt: null } }),
      this.prisma.member.count({ where: { deletedAt: null } }),
      this.prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'paid' } }),
      this.prisma.gym.count({
        where: { deletedAt: null, subscriptionStatus: { in: ['trialing', 'active'] } },
      }),
    ]);
    return {
      totalGyms,
      totalMembers,
      totalRevenue: Number(revenue._sum.amount ?? 0),
      activeGyms,
    };
  }

  async listGyms() {
    const gyms = await this.prisma.gym.findMany({
      where: { deletedAt: null },
      include: {
        owner: { select: { fullName: true, email: true } },
        _count: { select: { members: { where: { deletedAt: null } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return gyms.map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      ownerName: g.owner?.fullName ?? null,
      ownerEmail: g.owner?.email ?? null,
      subscriptionPlan: g.subscriptionPlan,
      subscriptionStatus: g.subscriptionStatus,
      memberCount: g._count.members,
      createdAt: g.createdAt,
    }));
  }

  async createGym(dto: PlatformCreateGymInput) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.ownerEmail } });
    if (existing) throw new ConflictException('Owner email already in use');

    const ownerRole = await this.prisma.role.findFirst({
      where: { name: ROLES.GYM_OWNER, gymId: null, isSystem: true },
    });
    if (!ownerRole) throw new NotFoundException('System roles are not seeded');

    const passwordHash = await this.passwords.hash(dto.ownerPassword);
    const slug = await this.uniqueSlug(dto.gymName);

    return this.prisma.$transaction(async (tx) => {
      const gym = await tx.gym.create({ data: { name: dto.gymName, slug } });
      const owner = await tx.user.create({
        data: {
          email: dto.ownerEmail,
          fullName: dto.ownerFullName,
          passwordHash,
          gymId: gym.id,
          emailVerifiedAt: new Date(),
        },
      });
      await tx.gym.update({ where: { id: gym.id }, data: { ownerUserId: owner.id } });
      await tx.userRole.create({ data: { userId: owner.id, roleId: ownerRole.id, gymId: gym.id } });
      return { id: gym.id, name: gym.name, slug: gym.slug, ownerEmail: owner.email };
    });
  }

  async updateSubscription(gymId: string, dto: UpdateSubscriptionInput) {
    const gym = await this.prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) throw new NotFoundException('Gym not found');
    return this.prisma.gym.update({
      where: { id: gymId },
      data: { subscriptionPlan: dto.subscriptionPlan, subscriptionStatus: dto.subscriptionStatus },
      select: { id: true, subscriptionPlan: true, subscriptionStatus: true },
    });
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
