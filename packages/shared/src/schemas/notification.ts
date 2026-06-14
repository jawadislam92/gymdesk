import { z } from 'zod';

export const broadcastNotificationSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().max(2000).optional(),
});
export type BroadcastNotificationInput = z.infer<typeof broadcastNotificationSchema>;
