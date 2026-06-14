import { createZodDto } from 'nestjs-zod';
import { updateGymSchema } from '@gymflow/shared';

export class UpdateGymDto extends createZodDto(updateGymSchema) {}
