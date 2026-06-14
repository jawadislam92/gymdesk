import { createZodDto } from 'nestjs-zod';
import { checkInSchema } from '@gymflow/shared';

export class CheckInDto extends createZodDto(checkInSchema) {}
