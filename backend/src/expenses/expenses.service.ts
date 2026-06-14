import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateExpenseInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  create(gymId: string, dto: CreateExpenseInput, recordedById?: string) {
    return this.prisma.expense.create({
      data: {
        gymId,
        category: dto.category,
        amount: dto.amount,
        currency: dto.currency ?? 'USD',
        description: dto.description ?? null,
        incurredOn: dto.incurredOn,
        recordedById: recordedById ?? null,
      },
    });
  }

  async list(gymId: string, limit = 100) {
    const rows = await this.prisma.expense.findMany({
      where: { gymId },
      orderBy: { incurredOn: 'desc' },
      take: limit,
    });
    return rows.map((e) => ({
      id: e.id,
      category: e.category,
      amount: Number(e.amount),
      currency: e.currency,
      description: e.description,
      incurredOn: e.incurredOn,
    }));
  }

  async remove(gymId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id, gymId } });
    if (!expense) throw new NotFoundException('Expense not found');
    await this.prisma.expense.delete({ where: { id } });
    return { success: true };
  }
}
