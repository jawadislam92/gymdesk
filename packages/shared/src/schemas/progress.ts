import { z } from 'zod';

export const createProgressSchema = z.object({
  weight: z.number().positive().max(1000).optional(),
  bodyFatPct: z.number().min(0).max(100).optional(),
  measurements: z.record(z.string(), z.number()).optional(),
  notes: z.string().max(1000).optional(),
});
export type CreateProgressInput = z.infer<typeof createProgressSchema>;

/** Staff record progress for a specific member (member self-logging omits memberId). */
export const staffCreateProgressSchema = createProgressSchema.extend({
  memberId: z.string().uuid(),
});
export type StaffCreateProgressInput = z.infer<typeof staffCreateProgressSchema>;
