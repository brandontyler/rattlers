/**
 * Tests for GET /users/profile Lambda handler.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "./handler";

// Mock the database modules
vi.mock("@shared/db/users", () => ({
  getUserProfile: vi.fn(),
  upsertUserProfile: vi.fn(),
}));

vi.mock("@shared/db/suggestions", () => ({
  getSuggestionsByUser: vi.fn(),
}));

import { getUserProfile, upsertUserProfile } from "@shared/db/users";
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
      expect(body.data).toEqual({
        id: "user-123",
        email: "test@example.com",
        username: "TestUser",
        name: "Test User",
        isAdmin: false,
        joinDate: "2024-01-01T00:00:00.000Z",
        stats: {
          totalSubmissions: 4,
          approvedSubmissions: 2,
          pendingSubmissions: 1,
          rejectedSubmissions: 1,
        },
      });
    });

    it("should create profile if user doesn't exist", async () => {
      vi.mocked(getUserProfile).mockResolvedValue(null);
      vi.mocked(upsertUserProfile).mockImplementation(async (profile) => profile);
      vi.mocked(getSuggestionsByUser).mockResolvedValue([]);

      const event = createMockEvent("new-user-456", "new@example.com");
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(upsertUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "new-user-456",
          email: "new@example.com",
        })
      );

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe("new-user-456");
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

  describe("error handling", () => {
    it("should return 500 on database error", async () => {
      vi.mocked(getUserProfile).mockRejectedValue(new Error("Database error"));

      const event = createMockEvent("user-123");
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(500);
    });
  });
});
