import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { type CreateMemberInput, type MemberListQuery, ROLES, type UpdateMemberInput } from '@gymflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { paginated, skip } from '../common/pagination';
import { randomBytes } from 'node:crypto';

const memberInclude = {
  user: { select: { fullName: true, email: true, phone: true } },
} satisfies Prisma.MemberInclude;

type MemberRow = Prisma.MemberGetPayload<{ include: typeof memberInclude }>;

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async create(gymId: string, dto: CreateMemberInput) {
    if (dto.email) {
      const taken = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (taken) throw new ConflictException('A user with this email already exists');
    }

    const memberCode = await this.nextMemberCode(gymId);
    const member = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { gymId, fullName: dto.fullName, email: dto.email ?? null, phone: dto.phone ?? null },
      });
      return tx.member.create({
        data: {
          gymId,
          userId: user.id,
          memberCode,
          checkInToken: randomBytes(12).toString('hex'),
          dateOfBirth: dto.dateOfBirth ?? null,
          gender: dto.gender ?? null,
          emergencyContact: dto.emergencyContact ?? null,
          healthNotes: dto.healthNotes ?? null,
          assignedTrainerId: dto.assignedTrainerId ?? null,
        },
        include: memberInclude,
      });
    });
    return this.shape(member);
  }

  async list(gymId: string, query: MemberListQuery) {
    const where: Prisma.MemberWhereInput = {
      gymId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.trainerId ? { assignedTrainerId: query.trainerId } : {}),
      ...(query.search
        ? {
            OR: [
              { memberCode: { contains: query.search, mode: 'insensitive' } },
              { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { user: { phone: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.member.findMany({
        where,
        include: memberInclude,
        orderBy: { createdAt: 'desc' },
        skip: skip(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.prisma.member.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.shape(row)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async get(gymId: string, id: string) {
    const member = await this.prisma.member.findFirst({
      where: { id, gymId, deletedAt: null },
      include: memberInclude,
    });
    if (!member) throw new NotFoundException('Member not found');
    return this.shape(member);
  }

  async update(gymId: string, id: string, dto: UpdateMemberInput) {
    const existing = await this.prisma.member.findFirst({ where: { id, gymId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Member not found');

    await this.prisma.$transaction(async (tx) => {
      const touchesIdentity =
        dto.fullName !== undefined || dto.email !== undefined || dto.phone !== undefined;
      if (existing.userId && touchesIdentity) {
        await tx.user.update({
          where: { id: existing.userId },
          data: { fullName: dto.fullName, email: dto.email, phone: dto.phone },
        });
      }
      await tx.member.update({
        where: { id },
        data: {
          dateOfBirth: dto.dateOfBirth,
          gender: dto.gender,
          emergencyContact: dto.emergencyContact,
          healthNotes: dto.healthNotes,
          assignedTrainerId: dto.assignedTrainerId,
        },
      });
    });
    return this.get(gymId, id);
  }

  async remove(gymId: string, id: string) {
    const existing = await this.prisma.member.findFirst({ where: { id, gymId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Member not found');
    await this.prisma.member.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'cancelled' },
    });
    return { success: true };
  }

  /** Give a member login credentials so they can use the member portal/app. */
  async grantLogin(gymId: string, memberId: string, email: string, password: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, gymId, deletedAt: null },
    });
    if (!member?.userId) throw new NotFoundException('Member not found');
    const userId = member.userId;

    const clash = await this.prisma.user.findFirst({ where: { email, NOT: { id: userId } } });
    if (clash) throw new ConflictException('That email is already in use');

    const passwordHash = await this.passwords.hash(password);
    const memberRole = await this.prisma.role.findFirst({
      where: { name: ROLES.MEMBER, gymId: null, isSystem: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { email, passwordHash, emailVerifiedAt: new Date() },
      });
      if (memberRole) {
        await tx.userRole.upsert({
          where: { userId_roleId_gymId: { userId, roleId: memberRole.id, gymId } },
          update: {},
          create: { userId, roleId: memberRole.id, gymId },
        });
      }
    });
    return { success: true, email };
  }

  private shape(member: MemberRow) {
    const { user, ...rest } = member;
    return {
      ...rest,
      fullName: user?.fullName ?? null,
      email: user?.email ?? null,
      phone: user?.phone ?? null,
    };
  }

  private async nextMemberCode(gymId: string): Promise<string> {
    const count = await this.prisma.member.count({ where: { gymId } });
    return `M${String(count + 1).padStart(4, '0')}`;
  }
}
