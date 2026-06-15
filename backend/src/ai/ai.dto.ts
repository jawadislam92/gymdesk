import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** A single turn in the visitor ↔ receptionist conversation. */
export const aiChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20),
});

export class AiChatDto extends createZodDto(aiChatSchema) {}
