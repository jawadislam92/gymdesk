import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const LOYALTY_POINTS = { CHECK_IN: 5, REFERRAL: 100 };

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  async balance(memberId: string): Promise<number> {
    const r = await this.prisma.loyaltyEntry.aggregate({ where: { memberId }, _sum: { points: true } });
    return r._sum.points ?? 0;
  }

  history(memberId: string) {
    return this.prisma.loyaltyEntry.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  award(gymId: string, memberId: string, points: number, reason: string) {
    return this.prisma.loyaltyEntry.create({ data: { gymId, memberId, points, reason } });
  }

  async summary(memberId: string) {
    const [balance, history] = await Promise.all([this.balance(memberId), this.history(memberId)]);
    return { balance, history };
  }
}
