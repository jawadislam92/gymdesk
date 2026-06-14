import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class CheckoutDto extends createZodDto(
  z.object({
    memberId: z.string().uuid(),
    membershipId: z.string().uuid().optional(),
    amount: z.coerce.number().positive().max(1_000_000),
    description: z.string().min(1).max(200).optional(),
  }),
) {}

export class ConfirmDto extends createZodDto(
  z.object({ sessionId: z.string().min(1).max(200) }),
) {}
