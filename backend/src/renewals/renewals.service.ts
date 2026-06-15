import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipsService } from '../memberships/memberships.service';
import { PaymentsService } from '../payments/payments.service';
import { addDays } from '../common/date';

@Injectable()
export class RenewalsService {
  private readonly logger = new Logger(RenewalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memberships: MembershipsService,
    private readonly payments: PaymentsService,
  ) {}

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
      autoRenew: m.autoRenew,
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

  /** Turn auto-renew on/off for a membership. */
  async setAutoRenew(gymId: string, membershipId: string, enabled: boolean) {
    const ms = await this.prisma.membership.findFirst({ where: { id: membershipId, gymId } });
    if (!ms) throw new NotFoundException('Membership not found');
    return this.prisma.membership.update({ where: { id: membershipId }, data: { autoRenew: enabled } });
  }

  /**
   * Auto-renew due memberships: extend the term, raise a (pending) invoice for the
   * dues, and notify the member. Pending invoices are collected by staff (cash) or
   * — once Stripe keys are added — charged automatically. Idempotent: renewing moves
   * the end date into the future, so the next run skips it.
   */
  async autoRenew(gymId: string) {
    const now = new Date();
    const due = await this.prisma.membership.findMany({
      where: {
        gymId,
        status: 'active',
        autoRenew: true,
        endDate: { lte: now, gte: addDays(now, -3) },
      },
      include: {
        plan: { select: { name: true, price: true, currency: true } },
        member: { select: { id: true, userId: true } },
      },
    });

    let renewed = 0;
    for (const m of due) {
      await this.memberships.renew(gymId, m.id, {});
      await this.payments.createPending({
        gymId,
        memberId: m.memberId,
        membershipId: m.id,
        amount: Number(m.plan.price),
        currency: m.plan.currency,
      });
      if (m.member?.userId) {
        await this.prisma.notification.create({
          data: {
            gymId,
            userId: m.member.userId,
            type: 'renewal',
            channel: 'in_app',
            title: 'Membership auto-renewed',
            body: `Your ${m.plan.name} membership renewed for another term. ${m.plan.currency} ${Number(
              m.plan.price,
            )} is now due.`,
            sentAt: now,
          },
        });
      }
      renewed += 1;
    }
    return { renewed };
  }

  /** Daily autopilot — auto-renew across every gym. */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async runAllAutoRenewals() {
    const gyms = await this.prisma.gym.findMany({ select: { id: true } });
    for (const g of gyms) {
      try {
        const r = await this.autoRenew(g.id);
        if (r.renewed > 0) this.logger.log(`gym ${g.id}: auto-renewed ${r.renewed} membership(s)`);
      } catch (e) {
        this.logger.error(`auto-renew failed for gym ${g.id}: ${(e as Error).message}`);
      }
    }
  }
}
