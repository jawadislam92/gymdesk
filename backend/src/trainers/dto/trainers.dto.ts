import { createZodDto } from 'nestjs-zod';
import { createTrainerSchema, updateTrainerSchema } from '@gymflow/shared';

export class CreateTrainerDto extends createZodDto(createTrainerSchema) {}
export class UpdateTrainerDto extends createZodDto(updateTrainerSchema) {}
