import { Injectable, NotFoundException } from '@nestjs/common';
import type { UpdateGymInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';

const gymSelect = {
  id: true,
  name: true,
  slug: true,
  currency: true,
  timezone: true,
  address: true,
  city: true,
  country: true,
  logoUrl: true,
  subscriptionPlan: true,
  subscriptionStatus: true,
} as const;

@Injectable()
export class GymsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(gymId: string) {
    const gym = await this.prisma.gym.findUnique({ where: { id: gymId }, select: gymSelect });
    if (!gym) throw new NotFoundException('Gym not found');
    return gym;
  }

  update(gymId: string, dto: UpdateGymInput) {
    return this.prisma.gym.update({
      where: { id: gymId },
      data: {
        name: dto.name,
        currency: dto.currency,
        timezone: dto.timezone,
        address: dto.address,
        city: dto.city,
        country: dto.country,
        logoUrl: dto.logoUrl,
      },
      select: gymSelect,
    });
  }
}
