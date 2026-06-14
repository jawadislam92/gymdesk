import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateMembershipInput, RenewMembershipInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { addDays } from '../common/date';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Assign a plan to a member: computes start/end + activates the member. */
  async assign(gymId: string, dto: CreateMembershipInput, createdById: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, gymId, deletedAt: null },
    });
    if (!member) throw new NotFoundException('Member not found');

    const plan = await this.prisma.membershipPlan.findFirst({
      where: { id: dto.planId, gymId, deletedAt: null },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    const startDate = dto.startDate ?? new Date();
    const endDate = addDays(startDate, plan.durationDays);
    const pricePaid = dto.pricePaid ?? Number(plan.price);

    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          gymId,
          memberId: member.id,
          planId: plan.id,
          startDate,
          endDate,
          status: 'active',
          pricePaid,
          autoRenew: dto.autoRenew ?? false,
          createdById,
        },
      });
      await tx.member.update({ where: { id: member.id }, data: { status: 'active' } });
      return membership;
    });
  }

  list(gymId: string, memberId?: string) {
    return this.prisma.membership.findMany({
      where: { gymId, ...(memberId ? { memberId } : {}) },
      include: { plan: { select: { name: true, durationDays: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Extend a membership by its plan's duration from the later of (current end, today). */
  async renew(gymId: string, id: string, dto: RenewMembershipInput) {
    const current = await this.prisma.membership.findFirst({
      where: { id, gymId },
      include: { plan: true },
    });
    if (!current) throw new NotFoundException('Membership not found');

    const base = current.endDate > new Date() ? current.endDate : new Date();
    const start = dto.startDate ?? base;
    const endDate = addDays(start, current.plan.durationDays);

    const membership = await this.prisma.membership.update({
      where: { id },
      data: {
        endDate,
        status: 'active',
        pricePaid: dto.pricePaid ?? Number(current.plan.price),
      },
    });
    await this.prisma.member.update({ where: { id: current.memberId }, data: { status: 'active' } });
    return membership;
  }

  async freeze(gymId: string, id: string) {
    return this.setStatus(gymId, id, 'frozen');
  }

  async cancel(gymId: string, id: string) {
    return this.setStatus(gymId, id, 'cancelled');
  }

  private async setStatus(gymId: string, id: string, status: 'frozen' | 'cancelled') {
    const membership = await this.prisma.membership.findFirst({ where: { id, gymId } });
    if (!membership) throw new NotFoundException('Membership not found');
    const updated = await this.prisma.membership.update({ where: { id }, data: { status } });
    await this.prisma.member.update({
      where: { id: membership.memberId },
      data: { status: status === 'cancelled' ? 'cancelled' : 'frozen' },
    });
    return updated;
  }
}
