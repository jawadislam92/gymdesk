import { z } from 'zod';
import { LEAD_STATUS } from '../constants/statuses';

export const createLeadSchema = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email().optional(),
  phone: z.string().min(3).max(32).optional(),
  message: z.string().max(1000).optional(),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadStatusSchema = z.object({
  status: z.enum([
    LEAD_STATUS.NEW,
    LEAD_STATUS.CONTACTED,
    LEAD_STATUS.CONVERTED,
    LEAD_STATUS.LOST,
  ]),
});
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
