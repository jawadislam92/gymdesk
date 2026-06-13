import type { PermissionKey, RoleName } from '@gymflow/shared';

/** Claims carried in the access token and attached to the request as `req.user`. */
export interface AuthUser {
  /** User id (JWT `sub`). */
  sub: string;
  gymId: string | null;
  roles: RoleName[];
  permissions: PermissionKey[];
  iat?: number;
  exp?: number;
}

export type AccessTokenPayload = Pick<AuthUser, 'sub' | 'gymId' | 'roles' | 'permissions'>;

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}
