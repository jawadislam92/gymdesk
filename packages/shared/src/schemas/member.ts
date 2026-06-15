import { z } from 'zod';
import { GENDER, MEMBER_STATUS } from '../constants/statuses';
import { paginationQuerySchema } from './common';

export const createMemberSchema = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email().optional(),
  phone: z.string().min(3).max(32).optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum([GENDER.MALE, GENDER.FEMALE, GENDER.OTHER]).optional(),
  emergencyContact: z.string().max(120).optional(),
  healthNotes: z.string().max(2000).optional(),
  assignedTrainerId: z.string().uuid().nullable().optional(),
  referredByCode: z.string().max(20).optional(),
});
export type CreateMemberInput = z.infer<typeof createMemberSchema>;

export const updateMemberSchema = createMemberSchema.partial();
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export const memberListQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum([
      MEMBER_STATUS.ACTIVE,
      MEMBER_STATUS.FROZEN,
      MEMBER_STATUS.EXPIRED,
      MEMBER_STATUS.CANCELLED,
    ])
    .optional(),
  trainerId: z.string().uuid().optional(),
});
export type MemberListQuery = z.infer<typeof memberListQuerySchema>;
