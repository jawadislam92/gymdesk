import { z } from 'zod';

export const checkInSchema = z
  .object({
    memberId: z.string().uuid().optional(),
    memberCode: z.string().min(1).max(40).optional(),
  })
  .refine((d) => Boolean(d.memberId) || Boolean(d.memberCode), {
    message: 'Provide memberId or memberCode',
  });
export type CheckInInput = z.infer<typeof checkInSchema>;
