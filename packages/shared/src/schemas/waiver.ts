import { z } from 'zod';

export const upsertWaiverSchema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(20000),
});
export type UpsertWaiverInput = z.infer<typeof upsertWaiverSchema>;
