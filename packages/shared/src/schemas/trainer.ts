import { z } from 'zod';

export const createTrainerSchema = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email().optional(),
  phone: z.string().min(3).max(32).optional(),
  specialization: z.string().max(120).optional(),
  bio: z.string().max(2000).optional(),
  hourlyRate: z.coerce.number().min(0).max(1_000_000).optional(),
  isActive: z.boolean().optional(),
});
export type CreateTrainerInput = z.infer<typeof createTrainerSchema>;

export const updateTrainerSchema = createTrainerSchema.partial();
export type UpdateTrainerInput = z.infer<typeof updateTrainerSchema>;
