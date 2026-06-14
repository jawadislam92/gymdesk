import { ROLES, type RoleName } from './roles';

/**
 * Permission keys checked by the backend RBAC guards. Derived from the
 * capability matrix in PRODUCT_PLAN.md §9. Conditional (⚠️) capabilities are
 * granted as a base permission here and further scoped in the service layer
 * (e.g. a trainer may only manage *their own* members).
 */
export const PERMISSIONS = {
  // Platform / SaaS
  PLATFORM_MANAGE: 'platform.manage', // super admin: all gyms + SaaS billing
  // Gym administration
  GYM_SETTINGS: 'gym.settings',
  DASHBOARD_VIEW: 'dashboard.view', // owner dashboard + financial reports
  PLANS_MANAGE: 'plans.manage',
  STAFF_MANAGE: 'staff.manage',
  TRAINERS_MANAGE: 'trainers.manage',
  // Front desk / operations
  MEMBERS_MANAGE: 'members.manage',
  PAYMENTS_COLLECT: 'payments.collect',
  PAYMENTS_REFUND: 'payments.refund',
  MEMBERSHIPS_RENEW: 'memberships.renew',
  ATTENDANCE_RECORD: 'attendance.record',
  // Classes / scheduling
  CLASSES_MANAGE: 'classes.manage', // create/edit the schedule
  CLASSES_BOOK: 'classes.book',
  // Training
  WORKOUTS_MANAGE: 'workouts.manage', // workout + diet plans
  PROGRESS_RECORD: 'progress.record',
  MEMBER_NOTES_VIEW: 'memberNotes.view',
  // Safety / audit
  RECORDS_HARD_DELETE: 'records.hardDelete',
  AUDIT_LOGS_VIEW: 'auditLogs.view',
  // Member self-service
  SELF_VIEW: 'self.view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const P = PERMISSIONS;

/**
 * Default permission set per role. Stored on the seeded `roles` table so it can
 * later be customised per gym, but these are the system defaults.
 */
export const ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.GYM_OWNER]: [
    P.GYM_SETTINGS,
    P.DASHBOARD_VIEW,
    P.PLANS_MANAGE,
    P.STAFF_MANAGE,
    P.TRAINERS_MANAGE,
    P.MEMBERS_MANAGE,
    P.PAYMENTS_COLLECT,
    P.PAYMENTS_REFUND,
    P.MEMBERSHIPS_RENEW,
    P.ATTENDANCE_RECORD,
    P.CLASSES_MANAGE,
    P.CLASSES_BOOK,
    P.WORKOUTS_MANAGE,
    P.PROGRESS_RECORD,
    P.MEMBER_NOTES_VIEW,
    P.AUDIT_LOGS_VIEW,
  ],
  [ROLES.GYM_MANAGER]: [
    P.GYM_SETTINGS, // limited in service layer
    P.DASHBOARD_VIEW,
    P.PLANS_MANAGE,
    P.STAFF_MANAGE, // cannot manage the owner — enforced in service layer
    P.TRAINERS_MANAGE,
    P.MEMBERS_MANAGE,
    P.PAYMENTS_COLLECT,
    P.PAYMENTS_REFUND,
    P.MEMBERSHIPS_RENEW,
    P.ATTENDANCE_RECORD,
    P.CLASSES_MANAGE,
    P.CLASSES_BOOK,
    P.WORKOUTS_MANAGE,
    P.PROGRESS_RECORD,
    P.MEMBER_NOTES_VIEW,
    P.AUDIT_LOGS_VIEW, // limited in service layer
  ],
  [ROLES.TRAINER]: [
    P.CLASSES_MANAGE, // own classes — scoped in service layer
    P.CLASSES_BOOK,
    P.WORKOUTS_MANAGE, // own members only — enforced in service layer
    P.PROGRESS_RECORD,
    P.MEMBER_NOTES_VIEW,
  ],
  [ROLES.RECEPTIONIST]: [
    P.MEMBERS_MANAGE,
    P.PAYMENTS_COLLECT, // refunds require manager approval (configurable)
    P.MEMBERSHIPS_RENEW,
    P.ATTENDANCE_RECORD,
    P.CLASSES_BOOK, // on behalf of members
  ],
  [ROLES.MEMBER]: [P.SELF_VIEW, P.CLASSES_BOOK],
};
