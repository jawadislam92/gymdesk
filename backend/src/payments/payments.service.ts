import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CreatePaymentInput, PaginationQuery } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { paginated, skip } from '../common/pagination';

const paymentInclude = {
  member: { select: { memberCode: true, user: { select: { fullName: true } } } },
} satisfies Prisma.PaymentInclude;

type PaymentRow = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(gymId: string, dto: CreatePaymentInput, collectedById: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, gymId, deletedAt: null },
    });
    if (!member) throw new NotFoundException('Member not found');

    if (dto.membershipId) {
      const membership = await this.prisma.membership.findFirst({
        where: { id: dto.membershipId, gymId },
      });
      if (!membership) throw new NotFoundException('Membership not found');
    }

    const invoiceNumber = await this.nextInvoiceNumber(gymId);
    const payment = await this.prisma.payment.create({
      data: {
        gymId,
        memberId: member.id,
        membershipId: dto.membershipId ?? null,
        amount: dto.amount,
        currency: dto.currency ?? 'USD',
        method: dto.method,
        status: 'paid',
        gateway: dto.gateway ?? dto.method,
        paidAt: new Date(),
        invoiceNumber,
        collectedById,
      },
      include: paymentInclude,
    });
    return this.shape(payment);
  }

  async list(gymId: string, query: PaginationQuery & { memberId?: string }) {
    const where: Prisma.PaymentWhereInput = {
      gymId,
      ...(query.memberId ? { memberId: query.memberId } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: paymentInclude,
        orderBy: { createdAt: 'desc' },
        skip: skip(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return paginated(
      rows.map((row) => this.shape(row)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async get(gymId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, gymId },
      include: paymentInclude,
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.shape(payment);
  }

  private shape(payment: PaymentRow) {
    const { member, amount, ...rest } = payment;
    return {
      ...rest,
      amount: Number(amount),
      memberCode: member?.memberCode ?? null,
      memberName: member?.user?.fullName ?? null,
    };
  }

  private async nextInvoiceNumber(gymId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.payment.count({ where: { gymId } });
    return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }
}
