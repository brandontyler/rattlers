/**
 * Tests for authentication utilities.
 */

import { describe, it, expect } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { extractUserGroups, extractUserFromEvent, hasPermission } from "./auth";
import { Permissions, Groups } from "../types/auth";

describe("Auth Utilities", () => {
  const createMockEvent = (claims: Record<string, unknown> = {}): APIGatewayProxyEvent =>
    ({
      requestContext: {
        authorizer: {
          claims,
        },
      },
    }) as unknown as APIGatewayProxyEvent;

  describe("extractUserGroups", () => {
    it("should extract groups from comma-separated string", () => {
      const event = createMockEvent({
        "cognito:groups": "NorthPoleCouncil,SantasHelpers",
      });

      const groups = extractUserGroups(event);
      expect(groups).toEqual(["NorthPoleCouncil", "SantasHelpers"]);
    });

    it("should handle array of groups", () => {
      const event = createMockEvent({
        "cognito:groups": ["WorkshopElves", "ChimneySweeps"],
      });

      const groups = extractUserGroups(event);
      expect(groups).toEqual(["WorkshopElves", "ChimneySweeps"]);
    });

    it("should return empty array for missing groups", () => {
      const event = createMockEvent({});
      const groups = extractUserGroups(event);
      expect(groups).toEqual([]);
    });

    it("should return empty array for missing authorizer", () => {
      const event = { requestContext: {} } as unknown as APIGatewayProxyEvent;
      const groups = extractUserGroups(event);
      expect(groups).toEqual([]);
    });
  });

  describe("extractUserFromEvent", () => {
    it("should extract user information", () => {
      const event = createMockEvent({
        sub: "user-123",
        email: "test@example.com",
        "cognito:groups": "Admins",
      });

      const result = extractUserFromEvent(event);

      expect(result.userId).toBe("user-123");
      expect(result.email).toBe("test@example.com");
      expect(result.isAdmin).toBe(true);
      expect(result.groups).toEqual(["Admins"]);
    });

    it("should identify admin from NorthPoleCouncil group", () => {
      const event = createMockEvent({
        sub: "user-456",
        "cognito:groups": "NorthPoleCouncil",
      });

      const result = extractUserFromEvent(event);
      expect(result.isAdmin).toBe(true);
    });

    it("should not identify non-admin groups as admin", () => {
      const event = createMockEvent({
        sub: "user-789",
        "cognito:groups": "SantasHelpers",
      });

      const result = extractUserFromEvent(event);
      expect(result.isAdmin).toBe(false);
    });

    it("should return null userId for missing claims", () => {
      const event = createMockEvent({});
      const result = extractUserFromEvent(event);
      expect(result.userId).toBeNull();
    });
  });

  describe("hasPermission", () => {
    it("should return true when user has required permission", () => {
      const groups = [Groups.NORTH_POLE_COUNCIL];
      expect(hasPermission(groups, Permissions.CAN_APPROVE)).toBe(true);
    });

    it("should return true for any matching permission", () => {
      const groups = [Groups.SANTAS_HELPERS];
      expect(hasPermission(groups, Permissions.CAN_APPROVE)).toBe(true);
    });

    it("should return false when user lacks permission", () => {
      const groups = [Groups.CHIMNEY_SWEEPS];
      expect(hasPermission(groups, Permissions.CAN_APPROVE)).toBe(false);
    });

    it("should return false for empty groups", () => {
      expect(hasPermission([], Permissions.CAN_APPROVE)).toBe(false);
    });

    it("should allow ChimneySweeps to reject", () => {
      const groups = [Groups.CHIMNEY_SWEEPS];
      expect(hasPermission(groups, Permissions.CAN_REJECT)).toBe(true);
    });

    it("should not allow ChimneySweeps to approve", () => {
      const groups = [Groups.CHIMNEY_SWEEPS];
      expect(hasPermission(groups, Permissions.CAN_APPROVE)).toBe(false);
    });
  });
});
