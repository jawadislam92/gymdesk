import { z } from 'zod';
import { SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS } from '../constants/statuses';

/** Super-admin creates a new tenant gym + its owner account. */
export const platformCreateGymSchema = z.object({
  gymName: z.string().min(1).max(120),
  ownerFullName: z.string().min(1).max(120),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(8).max(128),
});
export type PlatformCreateGymInput = z.infer<typeof platformCreateGymSchema>;

export const updateSubscriptionSchema = z.object({
  subscriptionPlan: z
    .enum([SUBSCRIPTION_PLAN.STARTER, SUBSCRIPTION_PLAN.PROFESSIONAL, SUBSCRIPTION_PLAN.ENTERPRISE])
    .optional(),
  subscriptionStatus: z
    .enum([
      SUBSCRIPTION_STATUS.TRIALING,
      SUBSCRIPTION_STATUS.ACTIVE,
      SUBSCRIPTION_STATUS.PAST_DUE,
      SUBSCRIPTION_STATUS.CANCELLED,
    ])
    .optional(),
});
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
