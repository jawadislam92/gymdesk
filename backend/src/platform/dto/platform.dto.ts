import { createZodDto } from 'nestjs-zod';
import { platformCreateGymSchema, updateSubscriptionSchema } from '@gymflow/shared';

export class PlatformCreateGymDto extends createZodDto(platformCreateGymSchema) {}
export class UpdateSubscriptionDto extends createZodDto(updateSubscriptionSchema) {}
