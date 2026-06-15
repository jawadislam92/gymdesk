import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class SetAutoRenewDto extends createZodDto(z.object({ enabled: z.boolean() })) {}
