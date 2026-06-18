import { z } from 'zod';

/**
 * Support access — a gym owner grants the platform/developer time-limited,
 * scoped, revocable access to their account so a reported issue can be fixed.
 * "Consented impersonation": nothing happens without the owner minting a code.
 */
export const SUPPORT_SCOPES = ['read_only', 'full'] as const;
export type SupportScope = (typeof SUPPORT_SCOPES)[number];

export const SUPPORT_SCOPE_LABELS: Record<SupportScope, string> = {
  read_only: 'Limited — view & diagnose (no billing, staff, settings or deletions)',
  full: 'Full — can make changes to fix the issue',
};

/** Gym owner mints a grant. Duration is capped so access can never be open-ended. */
export const createSupportGrantSchema = z.object({
  scope: z.enum(SUPPORT_SCOPES).default('full'),
  /** Plain-language note of what's wrong, shown to the operator. */
  reason: z.string().max(500).optional(),
  /** How long the window stays open. 1 hour … 7 days. */
  durationHours: z.coerce.number().int().min(1).max(168).default(24),
});
export type CreateSupportGrantInput = z.infer<typeof createSupportGrantSchema>;

/** Platform operator redeems a code to open a scoped, auto-expiring session. */
export const redeemSupportGrantSchema = z.object({
  code: z.string().min(6).max(64),
});
export type RedeemSupportGrantInput = z.infer<typeof redeemSupportGrantSchema>;
