import type { PermissionKey, RoleName } from '@gymflow/shared';

/** Claims carried in the access token and attached to the request as `req.user`. */
export interface AuthUser {
  /** User id (JWT `sub`). */
  sub: string;
  gymId: string | null;
  roles: RoleName[];
  permissions: PermissionKey[];
  /** Set when this token was minted via a consented support-access grant. */
  support?: boolean;
  /** The SupportGrant id backing a support session (for audit + the UI banner). */
  supportGrantId?: string;
  iat?: number;
  exp?: number;
}

export type AccessTokenPayload = Pick<AuthUser, 'sub' | 'gymId' | 'roles' | 'permissions'> &
  Partial<Pick<AuthUser, 'support' | 'supportGrantId'>>;

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}
