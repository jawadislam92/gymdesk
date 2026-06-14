import { createZodDto } from 'nestjs-zod';
import { createProgressSchema, staffCreateProgressSchema } from '@gymflow/shared';

export class CreateProgressDto extends createZodDto(createProgressSchema) {}
export class StaffCreateProgressDto extends createZodDto(staffCreateProgressSchema) {}
