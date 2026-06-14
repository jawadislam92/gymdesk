import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CreateProgressInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async create(gymId: string, memberId: string, dto: CreateProgressInput, recordedById?: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, gymId, deletedAt: null },
    });
    if (!member) throw new NotFoundException('Member not found');
    return this.prisma.progressRecord.create({
      data: {
        gymId,
        memberId,
        recordedById: recordedById ?? null,
        weight: dto.weight ?? null,
        bodyFatPct: dto.bodyFatPct ?? null,
        measurements: (dto.measurements ?? undefined) as Prisma.InputJsonValue | undefined,
        notes: dto.notes ?? null,
      },
    });
  }

  async listForMember(gymId: string, memberId: string) {
    const rows = await this.prisma.progressRecord.findMany({
      where: { gymId, memberId },
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      recordedAt: r.recordedAt,
      weight: r.weight ? Number(r.weight) : null,
      bodyFatPct: r.bodyFatPct ? Number(r.bodyFatPct) : null,
      notes: r.notes,
    }));
  }
}
