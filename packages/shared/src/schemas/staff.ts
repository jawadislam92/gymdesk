import { z } from 'zod';
import { ROLES } from '../constants/roles';

/** Roles an owner/manager can assign when inviting a team member. */
export const ASSIGNABLE_ROLES = [ROLES.GYM_MANAGER, ROLES.RECEPTIONIST, ROLES.TRAINER] as const;

export const inviteStaffSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(120),
  password: z.string().min(8).max(128),
  role: z.enum(ASSIGNABLE_ROLES),
});
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
