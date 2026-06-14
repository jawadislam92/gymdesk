import { z } from 'zod';

export const workoutExerciseSchema = z.object({
  name: z.string().min(1).max(120),
  dayIndex: z.number().int().min(0).max(6).optional(),
  sets: z.number().int().min(0).max(100).optional(),
  reps: z.number().int().min(0).max(1000).optional(),
  restSeconds: z.number().int().min(0).max(3600).optional(),
  weight: z.number().nonnegative().max(2000).optional(),
  notes: z.string().max(500).optional(),
});
export type WorkoutExerciseInput = z.infer<typeof workoutExerciseSchema>;

export const createWorkoutPlanSchema = z.object({
  memberId: z.string().uuid(),
  trainerId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(120),
  goal: z.string().max(200).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  exercises: z.array(workoutExerciseSchema).max(100).optional(),
});
export type CreateWorkoutPlanInput = z.infer<typeof createWorkoutPlanSchema>;
