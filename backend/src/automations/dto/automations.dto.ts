import { createZodDto } from 'nestjs-zod';
import { createAutomationSchema, updateAutomationSchema } from '@gymflow/shared';

export class CreateAutomationDto extends createZodDto(createAutomationSchema) {}
export class UpdateAutomationDto extends createZodDto(updateAutomationSchema) {}
