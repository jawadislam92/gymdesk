import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CreatePlanInput, UpdatePlanInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  create(gymId: string, dto: CreatePlanInput) {
    return this.prisma.membershipPlan.create({
      data: {
        gymId,
        name: dto.name,
        description: dto.description ?? null,
        durationDays: dto.durationDays,
        price: dto.price,
        currency: dto.currency ?? 'USD',
        classCredits: dto.classCredits ?? null,
        benefits: (dto.benefits ?? undefined) as Prisma.InputJsonValue | undefined,
        isActive: dto.isActive ?? true,
      },
    });
  }

  list(gymId: string, includeInactive = false) {
    return this.prisma.membershipPlan.findMany({
      where: { gymId, deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { price: 'asc' },
    });
  }

  async get(gymId: string, id: string) {
    const plan = await this.prisma.membershipPlan.findFirst({ where: { id, gymId, deletedAt: null } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async update(gymId: string, id: string, dto: UpdatePlanInput) {
    await this.get(gymId, id);
    return this.prisma.membershipPlan.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        durationDays: dto.durationDays,
        price: dto.price,
        currency: dto.currency,
        classCredits: dto.classCredits,
        benefits: (dto.benefits ?? undefined) as Prisma.InputJsonValue | undefined,
        isActive: dto.isActive,
      },
    });
  }

  async archive(gymId: string, id: string) {
    await this.get(gymId, id);
    return this.prisma.membershipPlan.update({ where: { id }, data: { isActive: false } });
  }
}
