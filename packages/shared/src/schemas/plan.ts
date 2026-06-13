import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  durationDays: z.number().int().min(1),
  price: z.number().nonnegative(),
  currency: z.string().length(3).default('USD'),
  /** null = unlimited classes. */
  classCredits: z.number().int().min(0).nullable().optional(),
  benefits: z.array(z.string().max(120)).max(50).optional(),
  isActive: z.boolean().default(true),
});
export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = createPlanSchema.partial();
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
