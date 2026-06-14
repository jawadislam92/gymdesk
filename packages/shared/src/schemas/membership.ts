import { z } from 'zod';

export const createMembershipSchema = z.object({
  memberId: z.string().uuid(),
  planId: z.string().uuid(),
  startDate: z.coerce.date().optional(),
  autoRenew: z.boolean().optional().default(false),
  /** Defaults to the plan price when omitted. */
  pricePaid: z.number().nonnegative().optional(),
});
export type CreateMembershipInput = z.infer<typeof createMembershipSchema>;

export const renewMembershipSchema = z.object({
  startDate: z.coerce.date().optional(),
  pricePaid: z.number().nonnegative().optional(),
});
export type RenewMembershipInput = z.infer<typeof renewMembershipSchema>;
