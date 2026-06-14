import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { addDays } from '../common/date';

@Injectable()
export class RenewalsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Active memberships ending within `days` (includes already-expired-but-active). */
  async expiring(gymId: string, days = 14) {
    const now = new Date();
    const until = addDays(now, days);
    const memberships = await this.prisma.membership.findMany({
      where: { gymId, status: 'active', endDate: { lte: until } },
      include: {
        member: { select: { id: true, memberCode: true, user: { select: { fullName: true } } } },
        plan: { select: { name: true } },
      },
      orderBy: { endDate: 'asc' },
      take: 200,
    });
    return memberships.map((m) => ({
      membershipId: m.id,
      memberId: m.memberId,
      memberCode: m.member?.memberCode ?? null,
      memberName: m.member?.user?.fullName ?? null,
      plan: m.plan?.name ?? null,
      endDate: m.endDate,
      daysRemaining: Math.ceil((m.endDate.getTime() - now.getTime()) / 86_400_000),
    }));
  }

  /** Send the member an in-app renewal reminder (if they have a login). */
  async remind(gymId: string, membershipId: string) {
    const ms = await this.prisma.membership.findFirst({
      where: { id: membershipId, gymId },
      include: { member: { select: { userId: true } }, plan: { select: { name: true } } },
    });
    if (!ms) throw new NotFoundException('Membership not found');
    const userId = ms.member?.userId ?? null;
    if (!userId) return { success: true, delivered: false };

    const endStr = ms.endDate.toISOString().slice(0, 10);
    await this.prisma.notification.create({
      data: {
        gymId,
        userId,
        type: 'renewal',
        channel: 'in_app',
        title: 'Membership renewal reminder',
        body: `Your ${ms.plan?.name ?? 'membership'} expires on ${endStr}. Renew to keep training!`,
        sentAt: new Date(),
      },
    });
    return { success: true, delivered: true };
  }
}
