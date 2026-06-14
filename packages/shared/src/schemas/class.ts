import { z } from 'zod';

export const createClassSchema = z
  .object({
    title: z.string().min(1).max(120),
    trainerId: z.string().uuid().nullable().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    capacity: z.number().int().min(0).default(0), // 0 = unlimited
    location: z.string().max(120).optional(),
    /** Also create this many additional weekly copies (recurring). */
    repeatWeeks: z.number().int().min(0).max(52).optional(),
  })
  .refine((c) => c.endsAt > c.startsAt, { message: 'End time must be after start time' });
export type CreateClassInput = z.infer<typeof createClassSchema>;

export const updateClassSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  trainerId: z.string().uuid().nullable().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  capacity: z.number().int().min(0).optional(),
  location: z.string().max(120).optional(),
});
export type UpdateClassInput = z.infer<typeof updateClassSchema>;

export const bookClassSchema = z.object({ memberId: z.string().uuid() });
export type BookClassInput = z.infer<typeof bookClassSchema>;
