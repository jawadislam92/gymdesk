import { createZodDto } from 'nestjs-zod';
import { loginSchema, refreshSchema, registerSchema } from '@gymflow/shared';

export class LoginDto extends createZodDto(loginSchema) {}
export class RegisterDto extends createZodDto(registerSchema) {}
export class RefreshDto extends createZodDto(refreshSchema) {}
