import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AddLeadActivityInput, CreateLeadInput, UpdateLeadInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MembersService } from '../members/members.service';

const STAGES = ['new', 'contacted', 'trial', 'negotiation', 'won', 'lost'] as const;

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly members: MembersService,
  ) {}

  async create(gymId: string, dto: CreateLeadInput, source = 'manual') {
    const lead = await this.prisma.lead.create({
      data: {
        gymId,
        fullName: dto.fullName,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        message: dto.message ?? null,
        value: dto.value ?? null,
        source: dto.source ?? source,
        lastActivityAt: new Date(),
      },
    });
    await this.log(gymId, lead.id, 'system', `Lead added (${lead.source ?? 'manual'})`);
    return lead;
  }

  list(gymId: string) {
    return this.prisma.lead.findMany({
      where: { gymId },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async get(gymId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, gymId },
      include: { activities: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(gymId: string, id: string, dto: UpdateLeadInput, userId?: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, gymId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const data: Prisma.LeadUpdateInput = { lastActivityAt: new Date() };
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.followUpAt !== undefined) data.followUpAt = dto.followUpAt ? new Date(dto.followUpAt) : null;
    if (dto.value !== undefined) data.value = dto.value;
    if (dto.assignedToId !== undefined) data.assignedToId = dto.assignedToId;
    if (dto.lostReason !== undefined) data.lostReason = dto.lostReason;

    const updated = await this.prisma.lead.update({ where: { id }, data });
    if (dto.status && dto.status !== lead.status) {
      await this.log(gymId, id, 'stage_change', `${lead.status} → ${dto.status}`, userId);
    }
    return updated;
  }

  async addActivity(gymId: string, id: string, dto: AddLeadActivityInput, userId?: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, gymId } });
    if (!lead) throw new NotFoundException('Lead not found');
    const activity = await this.log(gymId, id, dto.type, dto.body, userId);
    // First real outreach automatically advances a brand-new lead to "contacted".
    if (lead.status === 'new' && ['call', 'whatsapp', 'email'].includes(dto.type)) {
      await this.prisma.lead.update({
        where: { id },
        data: { status: 'contacted', lastActivityAt: new Date() },
      });
    }
    return activity;
  }

  async convert(gymId: string, id: string, userId?: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, gymId } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.convertedMemberId) throw new BadRequestException('Lead already converted to a member');

    const member = await this.members.create(gymId, {
      fullName: lead.fullName,
      email: lead.email ?? undefined,
      phone: lead.phone ?? undefined,
    });
    await this.prisma.lead.update({
      where: { id },
      data: { status: 'won', convertedMemberId: member.id, lastActivityAt: new Date() },
    });
    await this.log(gymId, id, 'system', `Converted to member ${member.memberCode}`, userId);
    return member;
  }

  async pipeline(gymId: string) {
    const leads = await this.prisma.lead.findMany({
      where: { gymId },
      select: { status: true, value: true, followUpAt: true },
    });
    const byStage: Record<string, { count: number; value: number }> = {};
    for (const s of STAGES) byStage[s] = { count: 0, value: 0 };
    const now = new Date();
    let followUpsDue = 0;
    for (const l of leads) {
      const bucket = byStage[l.status] ?? (byStage[l.status] = { count: 0, value: 0 });
      bucket.count += 1;
      bucket.value += Number(l.value ?? 0);
      if (l.followUpAt && l.followUpAt <= now && l.status !== 'won' && l.status !== 'lost') {
        followUpsDue += 1;
      }
    }
    const won = byStage['won'].count;
    const closed = won + byStage['lost'].count;
    const conversionRate = closed > 0 ? Math.round((won / closed) * 100) : 0;
    return { total: leads.length, byStage, conversionRate, followUpsDue };
  }

  private log(gymId: string, leadId: string, type: string, body?: string | null, userId?: string) {
    return this.prisma.leadActivity.create({
      data: { gymId, leadId, type, body: body ?? null, createdById: userId ?? null },
    });
  }
}
