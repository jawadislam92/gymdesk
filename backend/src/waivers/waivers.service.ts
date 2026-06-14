import { Injectable, NotFoundException } from '@nestjs/common';
import type { UpsertWaiverInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WaiversService {
  constructor(private readonly prisma: PrismaService) {}

  getActive(gymId: string) {
    return this.prisma.waiver.findFirst({
      where: { gymId, isActive: true },
      orderBy: { version: 'desc' },
    });
  }

  /** Publish a new version of the gym's agreement (supersedes the previous one). */
  async upsert(gymId: string, dto: UpsertWaiverInput) {
    const last = await this.prisma.waiver.findFirst({
      where: { gymId },
      orderBy: { version: 'desc' },
    });
    const version = (last?.version ?? 0) + 1;
    return this.prisma.$transaction(async (tx) => {
      await tx.waiver.updateMany({ where: { gymId, isActive: true }, data: { isActive: false } });
      return tx.waiver.create({
        data: { gymId, title: dto.title, body: dto.body, version, isActive: true },
      });
    });
  }

  async activeWithStats(gymId: string) {
    const active = await this.getActive(gymId);
    if (!active) return null;
    const acceptedCount = await this.prisma.waiverAcceptance.count({
      where: { gymId, waiverId: active.id },
    });
    return { ...active, acceptedCount };
  }

  async forMember(gymId: string, memberId: string) {
    const active = await this.getActive(gymId);
    if (!active) return { waiver: null, accepted: true, acceptedAt: null };
    const acceptance = await this.prisma.waiverAcceptance.findFirst({
      where: { gymId, waiverId: active.id, memberId },
    });
    return {
      waiver: { id: active.id, title: active.title, body: active.body, version: active.version },
      accepted: Boolean(acceptance),
      acceptedAt: acceptance?.acceptedAt ?? null,
    };
  }

  async accept(gymId: string, memberId: string, ipAddress?: string) {
    const active = await this.getActive(gymId);
    if (!active) throw new NotFoundException('No active agreement to accept');
    return this.prisma.waiverAcceptance.upsert({
      where: { waiverId_memberId: { waiverId: active.id, memberId } },
      update: {},
      create: { gymId, waiverId: active.id, memberId, ipAddress: ipAddress ?? null },
    });
  }
}
