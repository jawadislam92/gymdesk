import { z } from 'zod';

export const dietMealSchema = z.object({
  name: z.string().min(1).max(80),
  items: z.string().max(300).optional(),
});
export type DietMealInput = z.infer<typeof dietMealSchema>;

export const createDietPlanSchema = z.object({
  memberId: z.string().uuid(),
  title: z.string().min(1).max(120),
  targetCalories: z.number().int().min(0).max(20000).optional(),
  macros: z
    .object({
      protein: z.number().min(0).max(2000).optional(),
      carbs: z.number().min(0).max(2000).optional(),
      fat: z.number().min(0).max(2000).optional(),
    })
    .optional(),
  meals: z.array(dietMealSchema).max(20).optional(),
  notes: z.string().max(1000).optional(),
});
export type CreateDietPlanInput = z.infer<typeof createDietPlanSchema>;
