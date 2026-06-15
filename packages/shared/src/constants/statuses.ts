/**
 * Status / enum value catalogs (see PRODUCT_PLAN.md §8). String values match the
 * corresponding Prisma enums so the same literals flow from DB → API → clients.
 */

export const MEMBER_STATUS = {
  ACTIVE: 'active',
  FROZEN: 'frozen',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;
export type MemberStatus = (typeof MEMBER_STATUS)[keyof typeof MEMBER_STATUS];

export const MEMBERSHIP_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  FROZEN: 'frozen',
  CANCELLED: 'cancelled',
} as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUS)[keyof typeof MEMBERSHIP_STATUS];

export const PAYMENT_METHOD = {
  CASH: 'cash',
  CARD: 'card',
  ONLINE: 'online',
  BANK: 'bank',
} as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const PAYMENT_STATUS = {
  PAID: 'paid',
  PENDING: 'pending',
  PARTIAL: 'partial',
  REFUNDED: 'refunded',
  FAILED: 'failed',
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const ATTENDANCE_METHOD = {
  MANUAL: 'manual',
  QR: 'qr',
  BIOMETRIC: 'biometric',
} as const;
export type AttendanceMethod = (typeof ATTENDANCE_METHOD)[keyof typeof ATTENDANCE_METHOD];

export const BOOKING_STATUS = {
  BOOKED: 'booked',
  ATTENDED: 'attended',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;
export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const NOTIFICATION_TYPE = {
  RENEWAL: 'renewal',
  ANNOUNCEMENT: 'announcement',
  CLASS: 'class',
  PAYMENT: 'payment',
  SYSTEM: 'system',
} as const;
export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const NOTIFICATION_CHANNEL = {
  PUSH: 'push',
  EMAIL: 'email',
  SMS: 'sms',
  IN_APP: 'in_app',
} as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[keyof typeof NOTIFICATION_CHANNEL];

export const EXPENSE_CATEGORY = {
  RENT: 'rent',
  SALARY: 'salary',
  UTILITIES: 'utilities',
  EQUIPMENT: 'equipment',
  OTHER: 'other',
} as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORY)[keyof typeof EXPENSE_CATEGORY];

export const SUBSCRIPTION_STATUS = {
  TRIALING: 'trialing',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
} as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export const SUBSCRIPTION_PLAN = {
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLAN)[keyof typeof SUBSCRIPTION_PLAN];

export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
} as const;
export type Gender = (typeof GENDER)[keyof typeof GENDER];

export const LEAD_STATUS = {
  NEW: 'new',
  CONTACTED: 'contacted',
  TRIAL: 'trial',
  NEGOTIATION: 'negotiation',
  WON: 'won',
  LOST: 'lost',
} as const;
export type LeadStatus = (typeof LEAD_STATUS)[keyof typeof LEAD_STATUS];
