import { createZodDto } from 'nestjs-zod';
import { inviteStaffSchema } from '@gymflow/shared';

export class InviteStaffDto extends createZodDto(inviteStaffSchema) {}
