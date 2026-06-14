import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, startOfDay, startOfMonth } from '../common/date';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(gymId: string) {
    const now = new Date();
    const dayStart = startOfDay(now);
    const monthStart = startOfMonth(now);
    const soon = addDays(now, 7);

    const [activeMembers, totalMembers, expiringSoon, todayCheckIns, revenue] =
      await this.prisma.$transaction([
        this.prisma.member.count({ where: { gymId, deletedAt: null, status: 'active' } }),
        this.prisma.member.count({ where: { gymId, deletedAt: null } }),
        this.prisma.membership.count({
          where: { gymId, status: 'active', endDate: { gte: now, lte: soon } },
        }),
        this.prisma.attendance.count({ where: { gymId, checkedInAt: { gte: dayStart } } }),
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { gymId, status: 'paid', paidAt: { gte: monthStart } },
        }),
      ]);

    return {
      activeMembers,
      totalMembers,
      expiringSoon,
      todayCheckIns,
      revenueThisMonth: Number(revenue._sum.amount ?? 0),
    };
  }
}
