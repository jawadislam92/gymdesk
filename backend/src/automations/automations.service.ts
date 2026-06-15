import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { addDays } from '../common/date';

const RENEWAL_WINDOW_DAYS = 7;
const INACTIVE_DAYS = 14;

type ReminderType = 'renewal' | 'system';

/**
 * Automated retention engine — renewal reminders, win-backs, and birthday
 * messages. Reminders are delivered **in-app** (a targeted Notification the member
 * sees in their portal). External channels (WhatsApp / SMS / email) are **gated on
 * provider keys** — like Stripe, they light up automatically once configured, and
 * until then reminders still go out in-app and are logged for staff.
 */
@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Which delivery channels are actually wired up (config-gated). */
  channelStatus() {
    return {
      inapp: true,
      whatsapp: Boolean(process.env.WHATSAPP_API_TOKEN),
      sms: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      email: Boolean(process.env.RESEND_API_KEY),
    };
  }

  /** Daily autopilot at 8am server time — runs every gym. */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async runAll() {
    const gyms = await this.prisma.gym.findMany({ select: { id: true } });
    for (const g of gyms) {
      try {
        const r = await this.runForGym(g.id);
        if (r.total > 0) this.logger.log(`gym ${g.id}: sent ${r.total} reminders`);
      } catch (e) {
        this.logger.error(`automation run failed for gym ${g.id}: ${(e as Error).message}`);
      }
    }
  }

  async runForGym(gymId: string) {
    const now = new Date();
    let renewal = 0;
    let winback = 0;
    let birthday = 0;

    // 1) Renewal reminders — active memberships ending within the window.
    const expiring = await this.prisma.membership.findMany({
      where: {
        gymId,
        status: 'active',
        endDate: { gte: now, lte: addDays(now, RENEWAL_WINDOW_DAYS) },
      },
      include: {
        member: { include: { user: { select: { id: true, fullName: true } } } },
        plan: { select: { name: true } },
      },
    });
    for (const m of expiring) {
      if (!m.member.user) continue;
      const days = Math.max(0, Math.ceil((m.endDate.getTime() - now.getTime()) / 86_400_000));
      const first = m.member.user.fullName.split(' ')[0];
      const created = await this.emit(gymId, m.member.user.id, 'renewal', {
        kind: 'renewal',
        memberId: m.memberId,
        memberName: m.member.user.fullName,
        dedupKey: `renewal:${m.id}:${m.endDate.toISOString().slice(0, 10)}`,
        title: `Membership expires in ${days} day${days === 1 ? '' : 's'}`,
        body: `Hi ${first}, your ${m.plan.name} membership ends on ${m.endDate.toDateString()}. Renew now to keep your access.`,
      });
      if (created) renewal += 1;
    }

    // 2) Win-back — active members with no check-in in the last INACTIVE_DAYS.
    const cutoff = addDays(now, -INACTIVE_DAYS);
    const members = await this.prisma.member.findMany({
      where: {
        gymId,
        status: 'active',
        deletedAt: null,
        userId: { not: null },
        joinedAt: { lte: cutoff },
      },
      include: {
        user: { select: { id: true, fullName: true } },
        attendance: { orderBy: { checkedInAt: 'desc' }, take: 1, select: { checkedInAt: true } },
      },
    });
    const winBucket = Math.floor(now.getTime() / (INACTIVE_DAYS * 86_400_000));
    for (const mem of members) {
      if (!mem.user) continue;
      const last = mem.attendance[0]?.checkedInAt;
      if (last && last >= cutoff) continue;
      const first = mem.user.fullName.split(' ')[0];
      const created = await this.emit(gymId, mem.user.id, 'system', {
        kind: 'winback',
        memberId: mem.id,
        memberName: mem.user.fullName,
        dedupKey: `winback:${mem.id}:${winBucket}`,
        title: 'We miss you at the gym!',
        body: `Hi ${first}, we haven't seen you in a while. Come back this week — your goals are waiting!`,
      });
      if (created) winback += 1;
    }

    // 3) Birthdays — members whose birthday is today.
    const bdayMembers = await this.prisma.member.findMany({
      where: { gymId, deletedAt: null, userId: { not: null }, dateOfBirth: { not: null } },
      include: { user: { select: { id: true, fullName: true } } },
    });
    for (const mem of bdayMembers) {
      if (!mem.user || !mem.dateOfBirth) continue;
      if (
        mem.dateOfBirth.getUTCMonth() !== now.getUTCMonth() ||
        mem.dateOfBirth.getUTCDate() !== now.getUTCDate()
      ) {
        continue;
      }
      const first = mem.user.fullName.split(' ')[0];
      const created = await this.emit(gymId, mem.user.id, 'system', {
        kind: 'birthday',
        memberId: mem.id,
        memberName: mem.user.fullName,
        dedupKey: `birthday:${mem.id}:${now.getFullYear()}`,
        title: `Happy Birthday, ${first}! 🎉`,
        body: `The whole team wishes you a fantastic birthday. Enjoy a great workout on us!`,
      });
      if (created) birthday += 1;
    }

    return { renewal, winback, birthday, total: renewal + winback + birthday };
  }

  /** Create a targeted in-app notification once (idempotent on data.dedupKey). */
  private async emit(
    gymId: string,
    userId: string,
    type: ReminderType,
    p: { kind: string; memberId: string; memberName: string; dedupKey: string; title: string; body: string },
  ): Promise<boolean> {
    const existing = await this.prisma.notification.findFirst({
      where: { gymId, data: { path: ['dedupKey'], equals: p.dedupKey } },
      select: { id: true },
    });
    if (existing) return false;
    await this.prisma.notification.create({
      data: {
        gymId,
        userId,
        type,
        channel: 'in_app',
        title: p.title,
        body: p.body,
        sentAt: new Date(),
        data: { kind: p.kind, memberId: p.memberId, memberName: p.memberName, dedupKey: p.dedupKey },
      },
    });
    return true;
  }

  /** Recent reminder outbox for staff (targeted reminders, newest first). */
  log(gymId: string) {
    return this.prisma.notification.findMany({
      where: { gymId, userId: { not: null }, type: { in: ['renewal', 'system'] } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
