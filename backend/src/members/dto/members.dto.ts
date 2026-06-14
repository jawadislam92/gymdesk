import { createZodDto } from 'nestjs-zod';
import {
  createMemberSchema,
  loginSchema,
  memberListQuerySchema,
  updateMemberSchema,
} from '@gymflow/shared';

export class CreateMemberDto extends createZodDto(createMemberSchema) {}
export class UpdateMemberDto extends createZodDto(updateMemberSchema) {}
export class MemberListQueryDto extends createZodDto(memberListQuerySchema) {}
// Reuses the login shape (email + password) to set a member's credentials.
export class GrantLoginDto extends createZodDto(loginSchema) {}
