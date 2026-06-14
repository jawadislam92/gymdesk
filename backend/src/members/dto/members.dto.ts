import { createZodDto } from 'nestjs-zod';
import { createMemberSchema, memberListQuerySchema, updateMemberSchema } from '@gymflow/shared';

export class CreateMemberDto extends createZodDto(createMemberSchema) {}
export class UpdateMemberDto extends createZodDto(updateMemberSchema) {}
export class MemberListQueryDto extends createZodDto(memberListQuerySchema) {}
