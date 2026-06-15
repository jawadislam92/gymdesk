import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateLeadInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ClassesService } from '../classes/classes.service';
import { LeadsService } from '../leads/leads.service';
import { AttendanceService } from '../attendance/attendance.service';
import { addDays } from '../common/date';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classes: ClassesService,
    private readonly leads: LeadsService,
    private readonly attendance: AttendanceService,
  ) {}

  /** Self check-in from a scanned QR (token identifies the member + gym). */
  checkIn(token: string) {
    return this.attendance.checkInByToken(token);
  }

  async gymPage(slug: string) {
    const gym = await this.prisma.gym.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, name: true, city: true, country: true, logoUrl: true },
    });
    if (!gym) throw new NotFoundException('Gym not found');

    const classes = await this.classes.list(gym.id, new Date(), addDays(new Date(), 14));
    const plans = await this.prisma.membershipPlan.findMany({
      where: { gymId: gym.id, isActive: true, deletedAt: null },
      orderBy: { price: 'asc' },
      select: { name: true, price: true, durationDays: true },
    });

    return {
      gym: { name: gym.name, city: gym.city, country: gym.country, logoUrl: gym.logoUrl },
      classes,
      plans: plans.map((p) => ({ name: p.name, durationDays: p.durationDays, price: Number(p.price) })),
    };
  }

  async submitLead(slug: string, dto: CreateLeadInput) {
    const gym = await this.prisma.gym.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    if (!gym) throw new NotFoundException('Gym not found');
    await this.leads.create(gym.id, dto, 'public_page');
    return { success: true };
  }
}
