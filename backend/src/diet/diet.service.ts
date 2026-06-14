import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CreateDietPlanInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DietService {
  constructor(private readonly prisma: PrismaService) {}

  async create(gymId: string, dto: CreateDietPlanInput) {
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, gymId, deletedAt: null },
    });
    if (!member) throw new NotFoundException('Member not found');
    return this.prisma.dietPlan.create({
      data: {
        gymId,
        memberId: dto.memberId,
        title: dto.title,
        targetCalories: dto.targetCalories ?? null,
        macros: (dto.macros ?? undefined) as Prisma.InputJsonValue | undefined,
        meals: (dto.meals ?? undefined) as Prisma.InputJsonValue | undefined,
        notes: dto.notes ?? null,
      },
    });
  }

  listForMember(gymId: string, memberId: string) {
    return this.prisma.dietPlan.findMany({
      where: { gymId, memberId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(gymId: string, id: string) {
    const plan = await this.prisma.dietPlan.findFirst({ where: { id, gymId } });
    if (!plan) throw new NotFoundException('Diet plan not found');
    await this.prisma.dietPlan.delete({ where: { id } });
    return { success: true };
  }
}
