import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClassesService } from '../classes/classes.service';
import { addDays } from '../common/date';

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classes: ClassesService,
  ) {}

  private async resolveMember(gymId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { gymId, userId, deletedAt: null },
      include: { user: { select: { fullName: true, email: true, phone: true } } },
    });
    if (!member) throw new NotFoundException('No member profile is linked to this account');
    return member;
  }

  async summary(gymId: string, userId: string) {
    const m = await this.resolveMember(gymId, userId);
    const membership = await this.prisma.membership.findFirst({
      where: { gymId, memberId: m.id },
      orderBy: { endDate: 'desc' },
      include: { plan: { select: { name: true } } },
    });
    const daysRemaining = membership
      ? Math.ceil((membership.endDate.getTime() - Date.now()) / 86_400_000)
      : null;
    return {
      member: {
        id: m.id,
        memberCode: m.memberCode,
        fullName: m.user?.fullName ?? null,
        status: m.status,
      },
      membership: membership
        ? {
            plan: membership.plan?.name ?? null,
            status: membership.status,
            endDate: membership.endDate,
            daysRemaining,
          }
        : null,
    };
  }

  async payments(gymId: string, userId: string) {
    const m = await this.resolveMember(gymId, userId);
    const rows = await this.prisma.payment.findMany({
      where: { gymId, memberId: m.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, invoiceNumber: true, amount: true, method: true, paidAt: true },
    });
    return rows.map((p) => ({ ...p, amount: Number(p.amount) }));
  }

  async attendance(gymId: string, userId: string) {
    const m = await this.resolveMember(gymId, userId);
    return this.prisma.attendance.findMany({
      where: { gymId, memberId: m.id },
      orderBy: { checkedInAt: 'desc' },
      take: 50,
      select: { id: true, checkedInAt: true },
    });
  }

  async myBookings(gymId: string, userId: string) {
    const m = await this.resolveMember(gymId, userId);
    const bookings = await this.prisma.booking.findMany({
      where: { gymId, memberId: m.id, status: { not: 'cancelled' }, class: { isCancelled: false } },
      include: { class: { select: { id: true, title: true, startsAt: true, endsAt: true, location: true } } },
      orderBy: { class: { startsAt: 'asc' } },
    });
    return bookings.map((b) => ({
      bookingId: b.id,
      classId: b.class.id,
      title: b.class.title,
      startsAt: b.class.startsAt,
      endsAt: b.class.endsAt,
      location: b.class.location,
    }));
  }

  /** Upcoming classes the member can book (next 14 days). */
  availableClasses(gymId: string) {
    return this.classes.list(gymId, new Date(), addDays(new Date(), 14));
  }

  async bookClass(gymId: string, userId: string, classId: string) {
    const m = await this.resolveMember(gymId, userId);
    return this.classes.book(gymId, classId, m.id);
  }

  async cancelMyBooking(gymId: string, userId: string, bookingId: string) {
    const m = await this.resolveMember(gymId, userId);
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, gymId, memberId: m.id },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.classes.cancelBooking(gymId, bookingId);
  }
}
