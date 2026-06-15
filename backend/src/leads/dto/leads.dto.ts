import { createZodDto } from 'nestjs-zod';
import { addLeadActivitySchema, createLeadSchema, updateLeadSchema } from '@gymflow/shared';

export class CreateLeadDto extends createZodDto(createLeadSchema) {}
export class UpdateLeadDto extends createZodDto(updateLeadSchema) {}
export class AddLeadActivityDto extends createZodDto(addLeadActivitySchema) {}
