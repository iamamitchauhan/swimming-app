/**
 * Canonical user role identifiers used across the application.
 * Import from this module — never define roles inline in controllers or middleware.
 */
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  COACH: 'coach',
  PARENT: 'parent',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/** Roles that carry administrative privileges. */
export const ADMIN_ROLES: UserRole[] = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN];

/** Roles that belong to a club (all except super_admin). */
export const CLUB_ROLES: UserRole[] = [USER_ROLES.ADMIN, USER_ROLES.COACH];

/** Roles that can be invited by other club members. */
export const INVITABLE_ROLES: UserRole[] = [USER_ROLES.ADMIN, USER_ROLES.COACH];
