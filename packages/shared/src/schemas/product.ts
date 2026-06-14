import { z } from 'zod';
import { PAYMENT_METHOD } from '../constants/statuses';

export const createProductSchema = z.object({
  name: z.string().min(1).max(120),
  price: z.number().nonnegative(),
  stock: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const sellSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  method: z
    .enum([PAYMENT_METHOD.CASH, PAYMENT_METHOD.CARD, PAYMENT_METHOD.ONLINE, PAYMENT_METHOD.BANK])
    .optional(),
});
export type SellInput = z.infer<typeof sellSchema>;
