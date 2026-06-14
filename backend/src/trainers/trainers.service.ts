import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrainersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(gymId: string) {
    const trainers = await this.prisma.trainer.findMany({
      where: { gymId },
      include: {
        user: { select: { fullName: true, email: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return trainers.map((t) => ({
      id: t.id,
      fullName: t.user?.fullName ?? null,
      email: t.user?.email ?? null,
      specialization: t.specialization,
      isActive: t.isActive,
      memberCount: t._count.members,
    }));
  }

  async membersOf(gymId: string, trainerId: string) {
    const trainer = await this.prisma.trainer.findFirst({ where: { id: trainerId, gymId } });
    if (!trainer) throw new NotFoundException('Trainer not found');
    const members = await this.prisma.member.findMany({
      where: { gymId, assignedTrainerId: trainerId, deletedAt: null },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return members.map((m) => ({
      id: m.id,
      memberCode: m.memberCode,
      fullName: m.user?.fullName ?? null,
      status: m.status,
    }));
  }
}
