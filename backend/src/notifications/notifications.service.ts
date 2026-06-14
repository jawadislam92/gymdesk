import { Injectable } from '@nestjs/common';
import type { BroadcastNotificationInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Post a gym-wide announcement (single broadcast row, user_id null). */
  broadcast(gymId: string, dto: BroadcastNotificationInput) {
    return this.prisma.notification.create({
      data: {
        gymId,
        userId: null,
        type: 'announcement',
        channel: 'in_app',
        title: dto.title,
        body: dto.body ?? null,
        sentAt: new Date(),
      },
    });
  }

  listGym(gymId: string) {
    return this.prisma.notification.findMany({
      where: { gymId, type: 'announcement' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /** A member's feed: their own notifications + gym broadcasts. */
  listForUser(gymId: string, userId: string) {
    return this.prisma.notification.findMany({
      where: { gymId, OR: [{ userId }, { userId: null }] },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
