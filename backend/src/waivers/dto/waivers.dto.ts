import { createZodDto } from 'nestjs-zod';
import { upsertWaiverSchema } from '@gymflow/shared';

export class UpsertWaiverDto extends createZodDto(upsertWaiverSchema) {}
