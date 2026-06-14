import { createZodDto } from 'nestjs-zod';
import { createPlanSchema, updatePlanSchema } from '@gymflow/shared';

export class CreatePlanDto extends createZodDto(createPlanSchema) {}
export class UpdatePlanDto extends createZodDto(updatePlanSchema) {}
