import { z } from 'zod';
import { PAYMENT_METHOD } from '../constants/statuses';

export const createPaymentSchema = z.object({
  memberId: z.string().uuid(),
  membershipId: z.string().uuid().optional(),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
  method: z.enum([
    PAYMENT_METHOD.CASH,
    PAYMENT_METHOD.CARD,
    PAYMENT_METHOD.ONLINE,
    PAYMENT_METHOD.BANK,
  ]),
  gateway: z.string().max(40).optional(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
