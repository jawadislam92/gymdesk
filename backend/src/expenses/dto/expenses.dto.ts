import { createZodDto } from 'nestjs-zod';
import { createExpenseSchema } from '@gymflow/shared';

export class CreateExpenseDto extends createZodDto(createExpenseSchema) {}
