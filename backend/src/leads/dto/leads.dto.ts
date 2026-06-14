import { createZodDto } from 'nestjs-zod';
import { createLeadSchema, updateLeadStatusSchema } from '@gymflow/shared';

export class CreateLeadDto extends createZodDto(createLeadSchema) {}
export class UpdateLeadStatusDto extends createZodDto(updateLeadStatusSchema) {}
