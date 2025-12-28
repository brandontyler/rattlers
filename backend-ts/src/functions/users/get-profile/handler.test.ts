/**
 * Tests for GET /users/profile Lambda handler.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "./handler";

// Mock the Cognito client
vi.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  AdminGetUserCommand: vi.fn(),
}));

// Mock the database modules
vi.mock("@shared/db/users", () => ({
  getUserProfile: vi.fn(),
}));

vi.mock("@shared/db/suggestions", () => ({
  getSuggestionsByUser: vi.fn(),
}));

import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { getUserProfile } from "@shared/db/users";
import { getSuggestionsByUser } from "@shared/db/suggestions";

// Sample data
const sampleProfile = {
  userId: "user-123",
  email: "test@example.com",
  username: "TestUser",
  name: "Test User",
  isAdmin: false,
  createdAt: "2024-01-01T00:00:00.000Z",
};

const sampleSubmissions = [
  { id: "sub-1", status: "approved", submittedBy: "user-123" },
  { id: "sub-2", status: "pending", submittedBy: "user-123" },
  { id: "sub-3", status: "rejected", submittedBy: "user-123" },
  { id: "sub-4", status: "approved", submittedBy: "user-123" },
];

// Create mock authenticated event
const createMockEvent = (userId: string, email?: string): APIGatewayProxyEvent =>
  ({
    headers: {},
    requestContext: {
      authorizer: {
        claims: {
          sub: userId,
          email: email ?? "test@example.com",
        },
      },
    },
  }) as unknown as APIGatewayProxyEvent;

const mockContext = {} as Context;

describe("GET /users/profile Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.USER_POOL_ID = "us-east-1_test";

    // Default mock for Cognito client
    const mockSend = vi.fn().mockResolvedValue({
      UserCreateDate: new Date("2024-01-01T00:00:00.000Z"),
    });
    vi.mocked(CognitoIdentityProviderClient).mockImplementation(() => ({
      send: mockSend,
    }) as unknown as CognitoIdentityProviderClient);
  });

  describe("successful requests", () => {
    it("should return user profile with correct format", async () => {
      vi.mocked(getUserProfile).mockResolvedValue(sampleProfile);
      vi.mocked(getSuggestionsByUser).mockResolvedValue(sampleSubmissions);

      const event = createMockEvent("user-123", "test@example.com");
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe("user-123");
      expect(body.data.email).toBe("test@example.com");
      expect(body.data.username).toBe("TestUser");
      expect(body.data.isAdmin).toBe(false);
      expect(body.data.stats).toEqual({
        totalSubmissions: 4,
        approvedSubmissions: 2,
        pendingSubmissions: 1,
        rejectedSubmissions: 1,
      });
    });

    it("should work even if user profile doesn't exist in database", async () => {
      vi.mocked(getUserProfile).mockResolvedValue(null);
      vi.mocked(getSuggestionsByUser).mockResolvedValue([]);

      const event = createMockEvent("new-user-456", "new@example.com");
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe("new-user-456");
      expect(body.data.email).toBe("new@example.com");
      expect(body.data.username).toBeUndefined();
      expect(body.data.stats.totalSubmissions).toBe(0);
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(getUserProfile).mockRejectedValue(new Error("Database error"));
      vi.mocked(getSuggestionsByUser).mockRejectedValue(new Error("Database error"));

      const event = createMockEvent("user-123", "test@example.com");
      const result = await handler(event, mockContext);

      // Should still succeed with default values
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe("user-123");
      expect(body.data.stats.totalSubmissions).toBe(0);
    });

    it("should return correct stats for user with no submissions", async () => {
      vi.mocked(getUserProfile).mockResolvedValue(sampleProfile);
      vi.mocked(getSuggestionsByUser).mockResolvedValue([]);

      const event = createMockEvent("user-123");
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.data.stats).toEqual({
        totalSubmissions: 0,
        approvedSubmissions: 0,
        pendingSubmissions: 0,
        rejectedSubmissions: 0,
      });
    });
  });

  describe("authentication", () => {
    it("should return 401 for unauthenticated requests", async () => {
      const event = {
        headers: {},
        requestContext: {},
      } as unknown as APIGatewayProxyEvent;

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(401);
    });
  });
});
