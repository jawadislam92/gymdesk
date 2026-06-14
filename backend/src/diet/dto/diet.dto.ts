import { createZodDto } from 'nestjs-zod';
import { createDietPlanSchema } from '@gymflow/shared';

export class CreateDietPlanDto extends createZodDto(createDietPlanSchema) {}
