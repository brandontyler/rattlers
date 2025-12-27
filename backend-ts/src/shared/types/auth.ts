/**
 * Authentication and authorization types.
 *
 * Defines permission groups and access control structures.
 */

/**
 * Permission group names (Christmas-themed).
 */
export const Groups = {
  /** Super admins with full access */
  NORTH_POLE_COUNCIL: "NorthPoleCouncil",
  /** Can approve/reject submissions */
  SANTAS_HELPERS: "SantasHelpers",
  /** Can edit location details */
  WORKSHOP_ELVES: "WorkshopElves",
  /** Moderators who handle reports */
  CHIMNEY_SWEEPS: "ChimneySweeps",
  /** Legacy admin group (same as NorthPoleCouncil) */
  ADMINS: "Admins",
} as const;

export type GroupName = (typeof Groups)[keyof typeof Groups];

/**
 * Permission sets defining which groups can perform which actions.
 */
export const Permissions = {
  /** Groups that can approve/reject submissions */
  CAN_APPROVE: new Set([Groups.NORTH_POLE_COUNCIL, Groups.ADMINS, Groups.SANTAS_HELPERS]),

  /** Groups that can edit location details */
  CAN_EDIT: new Set([Groups.NORTH_POLE_COUNCIL, Groups.ADMINS, Groups.WORKSHOP_ELVES]),

  /** Groups that can handle reports and moderation */
  CAN_MODERATE: new Set([Groups.NORTH_POLE_COUNCIL, Groups.ADMINS, Groups.CHIMNEY_SWEEPS]),

  /** Groups that can reject content (moderators can reject but not approve) */
  CAN_REJECT: new Set([
    Groups.NORTH_POLE_COUNCIL,
    Groups.ADMINS,
    Groups.SANTAS_HELPERS,
    Groups.CHIMNEY_SWEEPS,
  ]),

  /** Groups that can permanently delete content */
  CAN_DELETE: new Set([Groups.NORTH_POLE_COUNCIL, Groups.ADMINS]),

  /** Groups that can access admin dashboard */
  CAN_VIEW_ADMIN: new Set([
    Groups.NORTH_POLE_COUNCIL,
    Groups.ADMINS,
    Groups.SANTAS_HELPERS,
    Groups.WORKSHOP_ELVES,
    Groups.CHIMNEY_SWEEPS,
  ]),

  /** Full admin access (super admin only) */
  FULL_ADMIN: new Set([Groups.NORTH_POLE_COUNCIL, Groups.ADMINS]),
} as const;

/**
 * Type for permission set keys.
 */
export type PermissionType = keyof typeof Permissions;
