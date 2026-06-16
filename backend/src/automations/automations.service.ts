import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Automation } from '@prisma/client';
import type { CreateAutomationInput, UpdateAutomationInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { addDays } from '../common/date';

/** The starter rules every gym gets — fully editable once created. */
const DEFAULTS: Omit<CreateAutomationInput, never>[] = [
  {
    name: 'Renewal reminder',
    trigger: 'membership_expiring',
    timingDays: 7,
    channel: 'in_app',
    title: 'Your membership is expiring soon',
    template: 'Hi {firstName}, your {planName} membership ends in {days} days. Renew now to keep your access.',
    enabled: true,
  },
  {
    name: 'Win-back (inactive members)',
    trigger: 'member_inactive',
    timingDays: 14,
    channel: 'in_app',
    title: 'We miss you at the gym!',
    template: "Hi {firstName}, we haven't seen you in a while — come back this week, your goals are waiting!",
    enabled: true,
  },
  {
    name: 'Birthday greeting',
    trigger: 'birthday',
    timingDays: 0,
    channel: 'in_app',
    title: 'Happy Birthday, {firstName}!',
    template: 'The whole team wishes you a fantastic birthday, {firstName}. Enjoy a workout on us!',
    enabled: true,
  },
];

/**
 * Automation engine. Staff create their own rules (trigger → message → channel →
 * on/off); the engine runs every enabled rule daily (and on demand). External
 * channels (WhatsApp / SMS / email) are config-gated like Stripe — until keys are
 * added every message is delivered in-app and logged.
 */
@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  channelStatus() {
    return {
      inapp: true,
      whatsapp: Boolean(process.env.WHATSAPP_API_TOKEN),
      sms: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      email: Boolean(process.env.RESEND_API_KEY),
    };
  }

  /** List a gym's rules, seeding the starter set on first access. */
  async list(gymId: string): Promise<Automation[]> {
    const existing = await this.prisma.automation.findMany({ where: { gymId }, orderBy: { createdAt: 'asc' } });
    if (existing.length > 0) return existing;
    await this.prisma.automation.createMany({ data: DEFAULTS.map((d) => ({ ...d, gymId })) });
    return this.prisma.automation.findMany({ where: { gymId }, orderBy: { createdAt: 'asc' } });
  }

  create(gymId: string, dto: CreateAutomationInput) {
    return this.prisma.automation.create({ data: { ...dto, gymId } });
  }

  async update(gymId: string, id: string, dto: UpdateAutomationInput) {
    const found = await this.prisma.automation.findFirst({ where: { id, gymId } });
    if (!found) throw new NotFoundException('Automation not found');
    return this.prisma.automation.update({ where: { id }, data: dto });
  }

  async remove(gymId: string, id: string) {
    const found = await this.prisma.automation.findFirst({ where: { id, gymId } });
    if (!found) throw new NotFoundException('Automation not found');
    await this.prisma.automation.delete({ where: { id } });
    return { success: true };
  }

  /** Daily autopilot at 8am server time — runs every gym's enabled rules. */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async runAll() {
    const gyms = await this.prisma.gym.findMany({ select: { id: true } });
    for (const g of gyms) {
      try {
        const r = await this.runForGym(g.id);
        if (r.sent > 0) this.logger.log(`gym ${g.id}: ${r.sent} messages from ${r.ran} automations`);
      } catch (e) {
        this.logger.error(`automation run failed for gym ${g.id}: ${(e as Error).message}`);
      }
    }
  }

  async runForGym(gymId: string): Promise<{ ran: number; sent: number }> {
    const rules = (await this.list(gymId)).filter((a) => a.enabled);
    const gym = await this.prisma.gym.findUnique({ where: { id: gymId }, select: { name: true } });
    const gymName = gym?.name ?? 'the gym';
    let sent = 0;
    for (const a of rules) sent += await this.runAutomation(gymId, a, gymName);
    return { ran: rules.length, sent };
  }

  private runAutomation(gymId: string, a: Automation, gymName: string): Promise<number> {
    switch (a.trigger) {
      case 'membership_expiring':
        return this.runExpiring(gymId, a, gymName);
      case 'member_inactive':
        return this.runInactive(gymId, a, gymName);
      case 'birthday':
        return this.runBirthday(gymId, a, gymName);
      case 'welcome':
        return this.runWelcome(gymId, a, gymName);
      default:
        return Promise.resolve(0);
    }
  }

  private async runExpiring(gymId: string, a: Automation, gymName: string): Promise<number> {
    const now = new Date();
    const rows = await this.prisma.membership.findMany({
      where: { gymId, status: 'active', endDate: { gte: now, lte: addDays(now, a.timingDays || 7) } },
      include: {
        member: { include: { user: { select: { id: true, fullName: true } } } },
        plan: { select: { name: true } },
      },
    });
    let n = 0;
    for (const m of rows) {
      if (!m.member.user) continue;
      const days = Math.max(0, Math.ceil((m.endDate.getTime() - now.getTime()) / 86_400_000));
      const ok = await this.emit(gymId, m.member.user.id, a, {
        firstName: m.member.user.fullName.split(' ')[0],
        memberName: m.member.user.fullName,
        planName: m.plan.name,
        days: String(days),
        gymName,
        dedupKey: `auto:${a.id}:${m.id}:${m.endDate.toISOString().slice(0, 10)}`,
      });
      if (ok) n += 1;
    }
    return n;
  }

  private async runInactive(gymId: string, a: Automation, gymName: string): Promise<number> {
    const now = new Date();
    const cutoff = addDays(now, -(a.timingDays || 14));
    const rows = await this.prisma.member.findMany({
      where: { gymId, status: 'active', deletedAt: null, userId: { not: null }, joinedAt: { lte: cutoff } },
      include: {
        user: { select: { id: true, fullName: true } },
        attendance: { orderBy: { checkedInAt: 'desc' }, take: 1, select: { checkedInAt: true } },
      },
    });
    const bucket = Math.floor(now.getTime() / ((a.timingDays || 14) * 86_400_000));
    let n = 0;
    for (const mem of rows) {
      if (!mem.user) continue;
      const last = mem.attendance[0]?.checkedInAt;
      if (last && last >= cutoff) continue;
      const ok = await this.emit(gymId, mem.user.id, a, {
        firstName: mem.user.fullName.split(' ')[0],
        memberName: mem.user.fullName,
        gymName,
        dedupKey: `auto:${a.id}:${mem.id}:${bucket}`,
      });
      if (ok) n += 1;
    }
    return n;
  }

  private async runBirthday(gymId: string, a: Automation, gymName: string): Promise<number> {
    const now = new Date();
    const rows = await this.prisma.member.findMany({
      where: { gymId, deletedAt: null, userId: { not: null }, dateOfBirth: { not: null } },
      include: { user: { select: { id: true, fullName: true } } },
    });
    let n = 0;
    for (const mem of rows) {
      if (!mem.user || !mem.dateOfBirth) continue;
      if (mem.dateOfBirth.getUTCMonth() !== now.getUTCMonth() || mem.dateOfBirth.getUTCDate() !== now.getUTCDate()) {
        continue;
      }
      const ok = await this.emit(gymId, mem.user.id, a, {
        firstName: mem.user.fullName.split(' ')[0],
        memberName: mem.user.fullName,
        gymName,
        dedupKey: `auto:${a.id}:${mem.id}:${now.getFullYear()}`,
      });
      if (ok) n += 1;
    }
    return n;
  }

  private async runWelcome(gymId: string, a: Automation, gymName: string): Promise<number> {
    const now = new Date();
    const since = addDays(now, -(a.timingDays || 1));
    const rows = await this.prisma.member.findMany({
      where: { gymId, deletedAt: null, userId: { not: null }, joinedAt: { gte: since } },
      include: { user: { select: { id: true, fullName: true } } },
    });
    let n = 0;
    for (const mem of rows) {
      if (!mem.user) continue;
      const ok = await this.emit(gymId, mem.user.id, a, {
        firstName: mem.user.fullName.split(' ')[0],
        memberName: mem.user.fullName,
        gymName,
        dedupKey: `auto:${a.id}:${mem.id}`,
      });
      if (ok) n += 1;
    }
    return n;
  }

  private render(tpl: string, vars: Record<string, string | undefined>): string {
    return tpl.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
  }

  private kindOf(trigger: string): string {
    return (
      { membership_expiring: 'renewal', member_inactive: 'winback', birthday: 'birthday', welcome: 'welcome' }[
        trigger
      ] ?? trigger
    );
  }

  /** Create a targeted notification once (idempotent on data.dedupKey). */
  private async emit(
    gymId: string,
    userId: string,
    a: Automation,
    vars: Record<string, string | undefined> & { dedupKey: string },
  ): Promise<boolean> {
    const existing = await this.prisma.notification.findFirst({
      where: { gymId, data: { path: ['dedupKey'], equals: vars.dedupKey } },
      select: { id: true },
    });
    if (existing) return false;

    // External channels are config-gated; the in-app Notification is always the
    // record + fallback. NotificationChannel has no 'whatsapp', so WhatsApp (and
    // any unconfigured channel) routes in-app until a provider is wired.
    const status = this.channelStatus();
    const channel: 'in_app' | 'sms' | 'email' =
      (a.channel === 'sms' && status.sms) || (a.channel === 'email' && status.email)
        ? (a.channel as 'sms' | 'email')
        : 'in_app';

    await this.prisma.notification.create({
      data: {
        gymId,
        userId,
        type: a.trigger === 'membership_expiring' ? 'renewal' : 'system',
        channel,
        title: this.render(a.title, vars),
        body: this.render(a.template, vars),
        sentAt: new Date(),
        data: {
          kind: this.kindOf(a.trigger),
          automationId: a.id,
          memberName: vars.memberName ?? null,
          dedupKey: vars.dedupKey,
        },
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
