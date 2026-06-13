/**
 * The fixed role catalog (see PRODUCT_PLAN.md §9). These string values match the
 * `RoleName` enum in the Prisma schema and the seeded `roles` table.
 */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  GYM_OWNER: 'gym_owner',
  GYM_MANAGER: 'gym_manager',
  TRAINER: 'trainer',
  RECEPTIONIST: 'receptionist',
  MEMBER: 'member',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: RoleName[] = Object.values(ROLES);
