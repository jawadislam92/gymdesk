import { z } from 'zod';
import { EXPENSE_CATEGORY } from '../constants/statuses';

export const createExpenseSchema = z.object({
  category: z.enum([
    EXPENSE_CATEGORY.RENT,
    EXPENSE_CATEGORY.SALARY,
    EXPENSE_CATEGORY.UTILITIES,
    EXPENSE_CATEGORY.EQUIPMENT,
    EXPENSE_CATEGORY.OTHER,
  ]),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
  description: z.string().max(300).optional(),
  incurredOn: z.coerce.date(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
