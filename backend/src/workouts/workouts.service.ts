import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateWorkoutPlanInput, WorkoutExerciseInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(gymId: string, dto: CreateWorkoutPlanInput) {
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, gymId, deletedAt: null },
    });
    if (!member) throw new NotFoundException('Member not found');

    return this.prisma.workoutPlan.create({
      data: {
        gymId,
        memberId: dto.memberId,
        trainerId: dto.trainerId ?? null,
        title: dto.title,
        goal: dto.goal ?? null,
        startDate: dto.startDate ?? null,
        endDate: dto.endDate ?? null,
        exercises: dto.exercises?.length
          ? {
              create: dto.exercises.map((e, i) => ({
                name: e.name,
                dayIndex: e.dayIndex ?? null,
                sets: e.sets ?? null,
                reps: e.reps ?? null,
                restSeconds: e.restSeconds ?? null,
                weight: e.weight ?? null,
                notes: e.notes ?? null,
                order: i,
              })),
            }
          : undefined,
      },
      include: { exercises: { orderBy: { order: 'asc' } } },
    });
  }

  listForMember(gymId: string, memberId: string) {
    return this.prisma.workoutPlan.findMany({
      where: { gymId, memberId },
      include: { exercises: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addExercise(gymId: string, planId: string, dto: WorkoutExerciseInput) {
    const plan = await this.prisma.workoutPlan.findFirst({ where: { id: planId, gymId } });
    if (!plan) throw new NotFoundException('Workout plan not found');
    const order = await this.prisma.workoutExercise.count({ where: { workoutPlanId: planId } });
    return this.prisma.workoutExercise.create({
      data: {
        workoutPlanId: planId,
        name: dto.name,
        dayIndex: dto.dayIndex ?? null,
        sets: dto.sets ?? null,
        reps: dto.reps ?? null,
        restSeconds: dto.restSeconds ?? null,
        weight: dto.weight ?? null,
        notes: dto.notes ?? null,
        order,
      },
    });
  }

  async remove(gymId: string, planId: string) {
    const plan = await this.prisma.workoutPlan.findFirst({ where: { id: planId, gymId } });
    if (!plan) throw new NotFoundException('Workout plan not found');
    await this.prisma.workoutPlan.delete({ where: { id: planId } });
    return { success: true };
  }
}
