import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '@gymflow/shared';

export const PERMISSIONS_KEY = 'requiredPermissions';

/** Requires the caller to hold all of the listed permissions (PermissionsGuard). */
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
