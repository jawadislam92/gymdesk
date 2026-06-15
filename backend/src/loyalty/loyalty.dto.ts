import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class AdjustPointsDto extends createZodDto(
  z.object({
    points: z.coerce.number().int().min(-100_000).max(100_000),
    reason: z.string().max(120).optional(),
  }),
) {}
