import { z } from 'zod';

export const AUTOMATION_TRIGGERS = ['membership_expiring', 'member_inactive', 'birthday', 'welcome'] as const;
export const AUTOMATION_CHANNELS = ['in_app', 'whatsapp', 'sms', 'email'] as const;

export const createAutomationSchema = z.object({
  name: z.string().min(1).max(120),
  trigger: z.enum(AUTOMATION_TRIGGERS),
  timingDays: z.coerce.number().int().min(0).max(365).default(7),
  channel: z.enum(AUTOMATION_CHANNELS).default('in_app'),
  title: z.string().min(1).max(160),
  template: z.string().min(1).max(1000),
  enabled: z.boolean().default(true),
});
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;

export const updateAutomationSchema = createAutomationSchema.partial();
export type UpdateAutomationInput = z.infer<typeof updateAutomationSchema>;
