import { createZodDto } from 'nestjs-zod';
import { createSupportGrantSchema, redeemSupportGrantSchema } from '@gymflow/shared';

export class CreateSupportGrantDto extends createZodDto(createSupportGrantSchema) {}
export class RedeemSupportGrantDto extends createZodDto(redeemSupportGrantSchema) {}
