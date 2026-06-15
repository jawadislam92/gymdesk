import { z } from 'zod';
import { LEAD_STATUS } from '../constants/statuses';

/** Sales-pipeline stages, in funnel order. */
export const LEAD_STAGES = [
  LEAD_STATUS.NEW,
  LEAD_STATUS.CONTACTED,
  LEAD_STATUS.TRIAL,
  LEAD_STATUS.NEGOTIATION,
  LEAD_STATUS.WON,
  LEAD_STATUS.LOST,
] as const;

export const createLeadSchema = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email().optional(),
  phone: z.string().min(3).max(32).optional(),
  message: z.string().max(1000).optional(),
  value: z.coerce.number().min(0).max(10_000_000).optional(),
  source: z.string().max(60).optional(),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = z.object({
  status: z.enum(LEAD_STAGES).optional(),
  followUpAt: z.string().datetime().nullable().optional(),
  value: z.coerce.number().min(0).max(10_000_000).nullable().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  lostReason: z.string().max(200).nullable().optional(),
});
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

export const addLeadActivitySchema = z.object({
  type: z.enum(['note', 'call', 'whatsapp', 'email']).default('note'),
  body: z.string().min(1).max(1000),
});
export type AddLeadActivityInput = z.infer<typeof addLeadActivitySchema>;
