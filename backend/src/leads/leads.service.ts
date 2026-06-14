import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateLeadInput, LeadStatus } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  create(gymId: string, dto: CreateLeadInput, source = 'manual') {
    return this.prisma.lead.create({
      data: {
        gymId,
        fullName: dto.fullName,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        message: dto.message ?? null,
        source,
      },
    });
  }

  list(gymId: string) {
    return this.prisma.lead.findMany({
      where: { gymId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async updateStatus(gymId: string, id: string, status: LeadStatus) {
    const lead = await this.prisma.lead.findFirst({ where: { id, gymId } });
    if (!lead) throw new NotFoundException('Lead not found');
    return this.prisma.lead.update({ where: { id }, data: { status } });
  }
}
