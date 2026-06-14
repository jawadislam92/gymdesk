import { createZodDto } from 'nestjs-zod';
import { bookClassSchema, createClassSchema, updateClassSchema } from '@gymflow/shared';

export class CreateClassDto extends createZodDto(createClassSchema) {}
export class UpdateClassDto extends createZodDto(updateClassSchema) {}
export class BookClassDto extends createZodDto(bookClassSchema) {}
