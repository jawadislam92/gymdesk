import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CheckInInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { startOfDay } from '../common/date';
import { LoyaltyService, LOYALTY_POINTS } from '../loyalty/loyalty.service';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loyalty: LoyaltyService,
  ) {}

  /** Check a member in and report whether their membership is currently valid. */
  async checkIn(gymId: string, dto: CheckInInput, recordedById?: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        gymId,
        deletedAt: null,
        ...(dto.memberId ? { id: dto.memberId } : { memberCode: dto.memberCode }),
      },
      include: {
        user: { select: { fullName: true } },
        memberships: { where: { status: 'active' }, orderBy: { endDate: 'desc' }, take: 1 },
      },
    });
    if (!member) throw new NotFoundException('Member not found');

    const active = member.memberships[0];
    const valid = Boolean(active && active.endDate > new Date());

    const attendance = await this.prisma.attendance.create({
      data: { gymId, memberId: member.id, method: 'manual', recordedById: recordedById ?? null },
    });
    await this.loyalty.award(gymId, member.id, LOYALTY_POINTS.CHECK_IN, 'Gym check-in');

    return {
      valid,
      attendance,
      member: {
        id: member.id,
        memberCode: member.memberCode,
        fullName: member.user?.fullName ?? null,
        status: member.status,
      },
      membership: active ? { id: active.id, endDate: active.endDate } : null,
    };
  }

  /** Self check-in via a member's QR token (public, kiosk/phone-scanned). */
  async checkInByToken(token: string) {
    const member = await this.prisma.member.findFirst({
      where: { checkInToken: token, deletedAt: null },
      include: {
        user: { select: { fullName: true } },
        memberships: { where: { status: 'active' }, orderBy: { endDate: 'desc' }, take: 1 },
      },
    });
    if (!member) throw new NotFoundException('Invalid check-in code');
    const active = member.memberships[0];
    const valid = Boolean(active && active.endDate > new Date());
    await this.prisma.attendance.create({
      data: { gymId: member.gymId, memberId: member.id, method: 'qr', recordedById: null },
    });
    await this.loyalty.award(member.gymId, member.id, LOYALTY_POINTS.CHECK_IN, 'QR check-in');
    return {
      valid,
      memberName: member.user?.fullName ?? null,
      memberCode: member.memberCode,
      membershipEndsAt: active?.endDate ?? null,
    };
  }

  /**
   * Look up a member's check-in eligibility WITHOUT recording attendance — powers
   * the front-desk "doorkeeper" view so staff see membership + dues before letting
   * someone in.
   */
  async lookup(gymId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, gymId, deletedAt: null },
      include: {
        user: { select: { fullName: true } },
        memberships: {
          where: { status: 'active' },
          orderBy: { endDate: 'desc' },
          take: 1,
          include: { plan: { select: { name: true } } },
        },
      },
    });
    if (!member) throw new NotFoundException('Member not found');

    const now = new Date();
    const active = member.memberships[0];
    const valid = Boolean(active && active.endDate > now);
    const daysLeft = active
      ? Math.ceil((active.endDate.getTime() - now.getTime()) / 86_400_000)
      : null;

    const duesAgg = await this.prisma.payment.aggregate({
      where: { gymId, memberId, status: 'pending' },
      _sum: { amount: true },
    });
    const dues = Number(duesAgg._sum.amount ?? 0);

    const last = await this.prisma.attendance.findFirst({
      where: { gymId, memberId },
      orderBy: { checkedInAt: 'desc' },
      select: { checkedInAt: true },
    });

    return {
      member: {
        id: member.id,
        memberCode: member.memberCode,
        fullName: member.user?.fullName ?? null,
        status: member.status,
      },
      membership: active ? { planName: active.plan?.name ?? null, endDate: active.endDate, valid, daysLeft } : null,
      dues,
      lastCheckIn: last?.checkedInAt ?? null,
    };
  }

  list(gymId: string, dateStr?: string, memberId?: string) {
    const where: Prisma.AttendanceWhereInput = { gymId, ...(memberId ? { memberId } : {}) };
    if (dateStr) {
      const start = startOfDay(new Date(dateStr));
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.checkedInAt = { gte: start, lt: end };
    }
    return this.prisma.attendance.findMany({
      where,
      include: { member: { select: { memberCode: true, user: { select: { fullName: true } } } } },
      orderBy: { checkedInAt: 'desc' },
      take: 200,
    });
  }

  async summary(gymId: string) {
    const start = startOfDay();
    const checkIns = await this.prisma.attendance.count({
      where: { gymId, checkedInAt: { gte: start } },
    });
    return { date: start.toISOString().slice(0, 10), checkIns };
  }
}
