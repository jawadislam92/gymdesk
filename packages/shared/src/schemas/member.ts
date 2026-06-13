import { z } from 'zod';
import { GENDER } from '../constants/statuses';

export const createMemberSchema = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email().optional(),
  phone: z.string().min(3).max(32).optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum([GENDER.MALE, GENDER.FEMALE, GENDER.OTHER]).optional(),
  emergencyContact: z.string().max(120).optional(),
  healthNotes: z.string().max(2000).optional(),
  assignedTrainerId: z.string().uuid().optional(),
});
export type CreateMemberInput = z.infer<typeof createMemberSchema>;

export const updateMemberSchema = createMemberSchema.partial();
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
