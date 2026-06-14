import { createParamDecorator, type ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../types/auth-user';

/** Injects the caller's gym id (tenant scope). Throws if the user has no gym. */
export const GymId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const user = ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
  if (!user?.gymId) {
    throw new ForbiddenException('No gym context for this account');
  }
  return user.gymId;
});
