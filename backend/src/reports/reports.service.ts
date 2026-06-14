import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  revenue(gymId: string, months = 6) {
    return this.prisma.$queryRaw<{ label: string; value: number }[]>(Prisma.sql`
      SELECT to_char(date_trunc('month', paid_at), 'YYYY-MM') AS label,
             COALESCE(SUM(amount), 0)::float AS value
      FROM payments
      WHERE gym_id = ${gymId} AND status = 'paid' AND paid_at >= ${monthsAgo(months)}
      GROUP BY 1 ORDER BY 1`);
  }

  membershipGrowth(gymId: string, months = 6) {
    return this.prisma.$queryRaw<{ label: string; value: number }[]>(Prisma.sql`
      SELECT to_char(date_trunc('month', joined_at), 'YYYY-MM') AS label,
             COUNT(*)::int AS value
      FROM members
      WHERE gym_id = ${gymId} AND deleted_at IS NULL AND joined_at >= ${monthsAgo(months)}
      GROUP BY 1 ORDER BY 1`);
  }

  attendance(gymId: string, days = 14) {
    return this.prisma.$queryRaw<{ label: string; value: number }[]>(Prisma.sql`
      SELECT to_char(date_trunc('day', checked_in_at), 'YYYY-MM-DD') AS label,
             COUNT(*)::int AS value
      FROM attendance
      WHERE gym_id = ${gymId} AND checked_in_at >= ${daysAgo(days)}
      GROUP BY 1 ORDER BY 1`);
  }

  expenses(gymId: string, months = 6) {
    return this.prisma.$queryRaw<{ label: string; value: number }[]>(Prisma.sql`
      SELECT to_char(date_trunc('month', incurred_on), 'YYYY-MM') AS label,
             COALESCE(SUM(amount), 0)::float AS value
      FROM expenses
      WHERE gym_id = ${gymId} AND incurred_on >= ${monthsAgo(months)}
      GROUP BY 1 ORDER BY 1`);
  }
}
