/**
 * Authentication and authorization utilities.
 *
 * Provides decorators and helpers for protecting Lambda functions
 * with JWT-based authentication and role-based access control.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import type { AuthenticatedEvent, AuthenticatedHandler, UserInfo } from "../types";
import { Permissions, type PermissionType } from "../types/auth";
import { unauthorizedError, forbiddenError } from "./responses";

/**
 * Extract user's Cognito groups from API Gateway event.
 */
export function extractUserGroups(event: APIGatewayProxyEvent): string[] {
  try {
    const authorizer = event.requestContext?.authorizer;
    if (!authorizer) return [];

    const claims = (authorizer as Record<string, unknown>).claims as Record<string, unknown> | undefined;
    if (!claims) return [];

    const groups = claims["cognito:groups"];
    if (typeof groups === "string") {
      return groups.split(",").filter(Boolean);
    }
    if (Array.isArray(groups)) {
      return groups.filter((g): g is string => typeof g === "string");
    }
    return [];
  } catch (error) {
    console.error("Error extracting groups:", error);
    return [];
  }
}

/**
 * Check if user has any of the required permission groups.
 */
export function hasPermission(groups: string[], requiredPermission: Set<string>): boolean {
  return groups.some((group) => requiredPermission.has(group));
}

/**
 * Extract user information from API Gateway event.
 */
export function extractUserFromEvent(
  event: APIGatewayProxyEvent
): { userId: string | null; email: string | null; isAdmin: boolean; groups: string[] } {
  try {
    const authorizer = event.requestContext?.authorizer;
    if (!authorizer) {
      return { userId: null, email: null, isAdmin: false, groups: [] };
    }

    const claims = (authorizer as Record<string, unknown>).claims as Record<string, unknown> | undefined;
    if (!claims) {
      return { userId: null, email: null, isAdmin: false, groups: [] };
    }

    const userId = claims.sub as string | undefined;
    const email = claims.email as string | undefined;
    const groups = extractUserGroups(event);
    const isAdmin = hasPermission(groups, Permissions.FULL_ADMIN);

    return {
      userId: userId ?? null,
      email: email ?? null,
      isAdmin,
      groups,
    };
  } catch (error) {
    console.error("Error extracting user from event:", error);
    return { userId: null, email: null, isAdmin: false, groups: [] };
  }
}

/**
 * Build complete UserInfo object from extracted user data.
 */
function buildUserInfo(
  userId: string,
  email: string | null,
  isAdmin: boolean,
  groups: string[]
): UserInfo {
  return {
    id: userId,
    email: email ?? undefined,
    isAdmin,
    groups,
    canApprove: hasPermission(groups, Permissions.CAN_APPROVE),
    canEdit: hasPermission(groups, Permissions.CAN_EDIT),
    canModerate: hasPermission(groups, Permissions.CAN_MODERATE),
    canReject: hasPermission(groups, Permissions.CAN_REJECT),
    canDelete: hasPermission(groups, Permissions.CAN_DELETE),
    canViewAdmin: hasPermission(groups, Permissions.CAN_VIEW_ADMIN),
  };
}

/**
 * Decorator to require authentication for a Lambda function.
 *
 * @example
 * export const handler = requireAuth(async (event, context) => {
 *   const user = event.user!;
 *   // ... handler logic
 * });
 */
export function requireAuth(
  handler: AuthenticatedHandler
): (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult> {
  return async (event: APIGatewayProxyEvent, context: Context) => {
    const { userId, email, isAdmin, groups } = extractUserFromEvent(event);

    if (!userId) {
      return unauthorizedError();
    }

    const authenticatedEvent: AuthenticatedEvent = {
      ...event,
      user: buildUserInfo(userId, email, isAdmin, groups),
    };

    return handler(authenticatedEvent, context);
  };
}

/**
 * Decorator to require full admin privileges.
 *
 * @example
 * export const handler = requireAdmin(async (event, context) => {
 *   const user = event.user!;
 *   // ... admin-only handler logic
 * });
 */
export function requireAdmin(
  handler: AuthenticatedHandler
): (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult> {
  return async (event: APIGatewayProxyEvent, context: Context) => {
    const { userId, email, isAdmin, groups } = extractUserFromEvent(event);

    if (!userId) {
      return unauthorizedError();
    }

    if (!isAdmin) {
      return forbiddenError("Admin access required");
    }

    const authenticatedEvent: AuthenticatedEvent = {
      ...event,
      user: {
        id: userId,
        email: email ?? undefined,
        isAdmin: true,
        groups,
        canApprove: true,
        canEdit: true,
        canModerate: true,
        canReject: true,
        canDelete: true,
        canViewAdmin: true,
      },
    };

    return handler(authenticatedEvent, context);
  };
}

/**
 * Decorator factory to require specific permissions.
 *
 * @example
 * export const handler = requirePermission('CAN_APPROVE', 'Approval permission required')(
 *   async (event, context) => {
 *     // ... handler logic
 *   }
 * );
 */
export function requirePermission(
  permissionType: PermissionType,
  errorMessage = "Permission denied"
): (
  handler: AuthenticatedHandler
) => (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult> {
  return (handler: AuthenticatedHandler) => {
    return async (event: APIGatewayProxyEvent, context: Context) => {
      const { userId, email, isAdmin, groups } = extractUserFromEvent(event);

      if (!userId) {
        return unauthorizedError();
      }

      const permissionSet = Permissions[permissionType];
      if (!hasPermission(groups, permissionSet)) {
        return forbiddenError(errorMessage);
      }

      const authenticatedEvent: AuthenticatedEvent = {
        ...event,
        user: buildUserInfo(userId, email, isAdmin, groups),
      };

      return handler(authenticatedEvent, context);
    };
  };
}

/**
 * Get user information from event (assumes auth decorator was used).
 */
export function getUserInfo(event: AuthenticatedEvent): UserInfo | undefined {
  return event.user;
}

// Convenience decorators for common permission checks

/**
 * Require approval permission (NorthPoleCouncil, Admins, SantasHelpers).
 */
export const requireApprovalPermission = requirePermission("CAN_APPROVE", "Approval permission required");

/**
 * Require edit permission (NorthPoleCouncil, Admins, WorkshopElves).
 */
export const requireEditPermission = requirePermission("CAN_EDIT", "Edit permission required");

/**
 * Require moderation permission (NorthPoleCouncil, Admins, ChimneySweeps).
 */
export const requireModerationPermission = requirePermission(
  "CAN_MODERATE",
  "Moderation permission required"
);

/**
 * Require admin view access (any admin group).
 */
export const requireAdminView = requirePermission("CAN_VIEW_ADMIN", "Admin access required");
