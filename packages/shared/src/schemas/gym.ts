import { z } from 'zod';

export const updateGymSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().max(64).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  logoUrl: z.string().url().optional(),
});
export type UpdateGymInput = z.infer<typeof updateGymSchema>;
