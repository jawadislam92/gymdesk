import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ROLES, type CreateTrainerInput, type UpdateTrainerInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';

const trainerInclude = {
  user: { select: { fullName: true, email: true, phone: true } },
  _count: { select: { members: true } },
} satisfies Prisma.TrainerInclude;

type TrainerRow = Prisma.TrainerGetPayload<{ include: typeof trainerInclude }>;

@Injectable()
export class TrainersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(gymId: string) {
    const trainers = await this.prisma.trainer.findMany({
      where: { gymId },
      include: trainerInclude,
      orderBy: { createdAt: 'asc' },
    });
    return trainers.map((t) => this.shape(t));
  }

  async get(gymId: string, id: string) {
    const t = await this.prisma.trainer.findFirst({ where: { id, gymId }, include: trainerInclude });
    if (!t) throw new NotFoundException('Trainer not found');
    return this.shape(t);
  }

  async create(gymId: string, dto: CreateTrainerInput) {
    if (dto.email) {
      const taken = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (taken) throw new ConflictException('A user with this email already exists');
    }
    const trainer = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { gymId, fullName: dto.fullName, email: dto.email ?? null, phone: dto.phone ?? null },
      });
      const t = await tx.trainer.create({
        data: {
          gymId,
          userId: user.id,
          specialization: dto.specialization ?? null,
          bio: dto.bio ?? null,
          hourlyRate: dto.hourlyRate ?? null,
          isActive: dto.isActive ?? true,
        },
        include: trainerInclude,
      });
      const role = await tx.role.findFirst({ where: { name: ROLES.TRAINER, gymId: null, isSystem: true } });
      if (role) {
        await tx.userRole.upsert({
          where: { userId_roleId_gymId: { userId: user.id, roleId: role.id, gymId } },
          update: {},
          create: { userId: user.id, roleId: role.id, gymId },
        });
      }
      return t;
    });
    return this.shape(trainer);
  }

  async update(gymId: string, id: string, dto: UpdateTrainerInput) {
    const existing = await this.prisma.trainer.findFirst({ where: { id, gymId } });
    if (!existing) throw new NotFoundException('Trainer not found');
    await this.prisma.$transaction(async (tx) => {
      const touchesIdentity =
        dto.fullName !== undefined || dto.email !== undefined || dto.phone !== undefined;
      if (touchesIdentity) {
        await tx.user.update({
          where: { id: existing.userId },
          data: { fullName: dto.fullName, email: dto.email, phone: dto.phone },
        });
      }
      await tx.trainer.update({
        where: { id },
        data: {
          specialization: dto.specialization,
          bio: dto.bio,
          hourlyRate: dto.hourlyRate,
          isActive: dto.isActive,
        },
      });
    });
    return this.get(gymId, id);
  }

  /** Archive — keeps history + member assignments, just hides from the active roster. */
  async remove(gymId: string, id: string) {
    const existing = await this.prisma.trainer.findFirst({ where: { id, gymId } });
    if (!existing) throw new NotFoundException('Trainer not found');
    await this.prisma.trainer.update({ where: { id }, data: { isActive: false } });
    return { success: true };
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

  private shape(t: TrainerRow) {
    return {
      id: t.id,
      fullName: t.user?.fullName ?? null,
      email: t.user?.email ?? null,
      phone: t.user?.phone ?? null,
      specialization: t.specialization,
      bio: t.bio,
      hourlyRate: t.hourlyRate != null ? Number(t.hourlyRate) : null,
      isActive: t.isActive,
      memberCount: t._count.members,
    };
  }
}
