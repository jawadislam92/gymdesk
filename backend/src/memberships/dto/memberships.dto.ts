import { createZodDto } from 'nestjs-zod';
import { createMembershipSchema, renewMembershipSchema } from '@gymflow/shared';

export class CreateMembershipDto extends createZodDto(createMembershipSchema) {}
export class RenewMembershipDto extends createZodDto(renewMembershipSchema) {}
