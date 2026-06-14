import { createZodDto } from 'nestjs-zod';
import { createWorkoutPlanSchema, workoutExerciseSchema } from '@gymflow/shared';

export class CreateWorkoutPlanDto extends createZodDto(createWorkoutPlanSchema) {}
export class WorkoutExerciseDto extends createZodDto(workoutExerciseSchema) {}
