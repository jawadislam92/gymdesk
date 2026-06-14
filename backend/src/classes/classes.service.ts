import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CreateClassInput, UpdateClassInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, startOfWeek } from '../common/date';

const listInclude = {
  trainer: { select: { user: { select: { fullName: true } } } },
  _count: { select: { bookings: { where: { status: { not: 'cancelled' } } } } },
} satisfies Prisma.GymClassInclude;

type ClassRow = Prisma.GymClassGetPayload<{ include: typeof listInclude }>;

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(gymId: string, dto: CreateClassInput) {
    const base = {
      gymId,
      title: dto.title,
      trainerId: dto.trainerId ?? null,
      capacity: dto.capacity ?? 0,
      location: dto.location ?? null,
    };
    const occurrences = [{ startsAt: dto.startsAt, endsAt: dto.endsAt }];
    for (let i = 1; i <= (dto.repeatWeeks ?? 0); i++) {
      occurrences.push({ startsAt: addDays(dto.startsAt, 7 * i), endsAt: addDays(dto.endsAt, 7 * i) });
    }
    await this.prisma.gymClass.createMany({ data: occurrences.map((o) => ({ ...base, ...o })) });
    return { created: occurrences.length };
  }

  async list(gymId: string, from?: Date, to?: Date) {
    const start = from ?? startOfWeek();
    const end = to ?? addDays(start, 7);
    const rows = await this.prisma.gymClass.findMany({
      where: { gymId, startsAt: { gte: start, lt: end } },
      include: listInclude,
      orderBy: { startsAt: 'asc' },
    });
    return rows.map((r) => this.shape(r));
  }

  async get(gymId: string, id: string) {
    const cls = await this.prisma.gymClass.findFirst({
      where: { id, gymId },
      include: {
        trainer: { select: { user: { select: { fullName: true } } } },
        bookings: {
          where: { status: { not: 'cancelled' } },
          include: { member: { select: { memberCode: true, user: { select: { fullName: true } } } } },
          orderBy: { bookedAt: 'asc' },
        },
      },
    });
    if (!cls) throw new NotFoundException('Class not found');
    return {
      id: cls.id,
      title: cls.title,
      startsAt: cls.startsAt,
      endsAt: cls.endsAt,
      capacity: cls.capacity,
      location: cls.location,
      isCancelled: cls.isCancelled,
      trainerName: cls.trainer?.user?.fullName ?? null,
      bookedCount: cls.bookings.length,
      bookings: cls.bookings.map((b) => ({
        id: b.id,
        memberCode: b.member?.memberCode ?? null,
        fullName: b.member?.user?.fullName ?? null,
        status: b.status,
      })),
    };
  }

  async update(gymId: string, id: string, dto: UpdateClassInput) {
    const cls = await this.prisma.gymClass.findFirst({ where: { id, gymId } });
    if (!cls) throw new NotFoundException('Class not found');
    return this.prisma.gymClass.update({
      where: { id },
      data: {
        title: dto.title,
        trainerId: dto.trainerId,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        capacity: dto.capacity,
        location: dto.location,
      },
    });
  }

  async cancel(gymId: string, id: string) {
    const cls = await this.prisma.gymClass.findFirst({ where: { id, gymId } });
    if (!cls) throw new NotFoundException('Class not found');
    return this.prisma.gymClass.update({ where: { id }, data: { isCancelled: true } });
  }

  async book(gymId: string, classId: string, memberId: string) {
    const cls = await this.prisma.gymClass.findFirst({ where: { id: classId, gymId } });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.isCancelled) throw new ConflictException('Class is cancelled');

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, gymId, deletedAt: null },
    });
    if (!member) throw new NotFoundException('Member not found');

    const existing = await this.prisma.booking.findUnique({
      where: { classId_memberId: { classId, memberId } },
    });
    if (existing && existing.status !== 'cancelled') {
      throw new ConflictException('Member is already booked into this class');
    }

    if (cls.capacity > 0) {
      const active = await this.prisma.booking.count({
        where: { classId, status: { not: 'cancelled' } },
      });
      if (active >= cls.capacity) throw new ConflictException('Class is full');
    }

    return existing
      ? this.prisma.booking.update({
          where: { id: existing.id },
          data: { status: 'booked', bookedAt: new Date() },
        })
      : this.prisma.booking.create({ data: { gymId, classId, memberId, status: 'booked' } });
  }

  async cancelBooking(gymId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, gymId } });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.prisma.booking.update({ where: { id: bookingId }, data: { status: 'cancelled' } });
  }

  private shape(row: ClassRow) {
    return {
      id: row.id,
      title: row.title,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      capacity: row.capacity,
      location: row.location,
      isCancelled: row.isCancelled,
      trainerName: row.trainer?.user?.fullName ?? null,
      bookedCount: row._count.bookings,
    };
  }
}
