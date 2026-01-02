/**
 * Tests for POST /locations/{id}/checkins Lambda handler.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Context } from "aws-lambda";
import { handler } from "./handler";
import type { AuthenticatedEvent } from "@shared/types";

// Mock the database modules
vi.mock("@shared/db/locations", () => ({
  getLocation: vi.fn(),
}));

vi.mock("@shared/db/checkins", () => ({
  createCheckIn: vi.fn(),
}));

vi.mock("@shared/db/users", () => ({
  getUsername: vi.fn(),
}));

// Mock auth utilities
vi.mock("@shared/utils/auth", () => ({
  requireAuth: vi.fn((fn) => fn),
  getUserInfo: vi.fn(),
}));

// Mock uuid
vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-123"),
}));

import { getLocation } from "@shared/db/locations";
import { createCheckIn } from "@shared/db/checkins";
import { getUsername } from "@shared/db/users";
import { getUserInfo } from "@shared/utils/auth";

// Sample data
const sampleLocation = {
  id: "loc-123",
  address: "123 Main St, Dallas, TX",
  status: "active",
  lat: 32.7767,
  lng: -96.797,
  likeCount: 10,
};

const sampleUser = {
  id: "user-456",
  email: "test@example.com",
};

// Create mock event
const createMockEvent = (
  locationId: string,
  body: Record<string, unknown>
): AuthenticatedEvent =>
  ({
    pathParameters: { id: locationId },
    headers: { Authorization: "Bearer token" },
    requestContext: {
      authorizer: {
        claims: {
          sub: sampleUser.id,
          email: sampleUser.email,
        },
      },
    },
    body: JSON.stringify(body),
  }) as unknown as AuthenticatedEvent;

const mockContext = {} as Context;

describe("POST /locations/{id}/checkins Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserInfo).mockReturnValue(sampleUser);
    vi.mocked(getLocation).mockResolvedValue(sampleLocation);
    vi.mocked(getUsername).mockResolvedValue("TestUser");
    vi.mocked(createCheckIn).mockImplementation(async (checkIn) => checkIn);
  });

  describe("successful check-in", () => {
    it("should create a check-in with status 'on'", async () => {
      const event = createMockEvent("loc-123", { status: "on" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(201);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("on");
      expect(body.data.locationId).toBe("loc-123");
      // Security: userId should NOT be exposed in response
      expect(body.data.userId).toBeUndefined();
      expect(body.data.username).toBe("TestUser");

      expect(createCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "test-uuid-123",
          locationId: "loc-123",
          userId: "user-456",
          username: "TestUser",
          status: "on",
        })
      );
    });

    it("should create a check-in with status 'amazing' and note", async () => {
      const event = createMockEvent("loc-123", {
        status: "amazing",
        note: "Snow machine running!",
      });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(201);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("amazing");
      expect(body.data.note).toBe("Snow machine running!");
    });

    it("should create a check-in with status 'off'", async () => {
      const event = createMockEvent("loc-123", { status: "off" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(201);

      const body = JSON.parse(result.body);
      expect(body.data.status).toBe("off");
    });

    it("should create a check-in with status 'changed'", async () => {
      const event = createMockEvent("loc-123", { status: "changed" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(201);

      const body = JSON.parse(result.body);
      expect(body.data.status).toBe("changed");
    });

    it("should fallback to 'Anonymous' when username is not found (security: never expose email)", async () => {
      vi.mocked(getUsername).mockResolvedValue(null);

      const event = createMockEvent("loc-123", { status: "on" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(201);

      const body = JSON.parse(result.body);
      // Security fix: Never fall back to email - use "Anonymous" instead
      expect(body.data.username).toBe("Anonymous");
    });

    it("should not expose userId in response (security: prevent user tracking)", async () => {
      const event = createMockEvent("loc-123", { status: "on" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(201);

      const body = JSON.parse(result.body);
      // Security: userId should not be in the response
      expect(body.data.userId).toBeUndefined();
      // But other fields should be present
      expect(body.data.id).toBeDefined();
      expect(body.data.locationId).toBe("loc-123");
      expect(body.data.username).toBe("TestUser");
    });
  });

  describe("validation errors", () => {
    it("should return 400 when location ID is missing", async () => {
      const event = {
        pathParameters: {},
        headers: {},
        requestContext: {},
        body: JSON.stringify({ status: "on" }),
      } as unknown as AuthenticatedEvent;

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe("Location ID is required");
    });

    it("should return 400 when status is missing", async () => {
      const event = createMockEvent("loc-123", {});
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      // Zod validation returns details object with field-specific errors
      expect(body.error.details.status).toBeDefined();
    });

    it("should return 400 when status is invalid", async () => {
      const event = createMockEvent("loc-123", { status: "invalid" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      // Zod validation returns details with specific status error
      expect(body.error.details.status).toContain("Status must be one of");
    });

    it("should return 400 when note exceeds 280 characters", async () => {
      const longNote = "a".repeat(281);
      const event = createMockEvent("loc-123", { status: "on", note: longNote });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      // Zod validation returns details with specific note error
      expect(body.error.details.note).toBe("Note must be 280 characters or less");
    });

    it("should return 400 for invalid JSON body", async () => {
      const event = {
        pathParameters: { id: "loc-123" },
        headers: {},
        requestContext: {},
        body: "invalid json",
      } as unknown as AuthenticatedEvent;

      vi.mocked(getUserInfo).mockReturnValue(sampleUser);

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      // parseJsonBody returns error in details.body for invalid JSON
      expect(body.error.details.body).toBe("Invalid JSON in request body");
    });

    it("should return 400 when photoKey has invalid format (security: prevent path traversal)", async () => {
      const event = createMockEvent("loc-123", {
        status: "on",
        photoKey: "../../../etc/passwd",
      });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.details.photoKey).toContain("Invalid photoKey format");
    });

    it("should return 404 when location does not exist", async () => {
      vi.mocked(getLocation).mockResolvedValue(null);

      const event = createMockEvent("non-existent", { status: "on" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(404);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe("Location not found");
    });
  });

  describe("error handling", () => {
    it("should return 500 on database error", async () => {
      vi.mocked(getLocation).mockRejectedValue(new Error("Database error"));

      const event = createMockEvent("loc-123", { status: "on" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(500);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });
  });
});
