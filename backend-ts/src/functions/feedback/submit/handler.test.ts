/**
 * Tests for POST /locations/{id}/feedback Lambda handler.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Context } from "aws-lambda";
import { handler } from "./handler";
import type { AuthenticatedEvent } from "@shared/types";

// Mock the database modules
vi.mock("@shared/db/locations", () => ({
  getLocation: vi.fn(),
  incrementLikeCount: vi.fn(),
  decrementLikeCount: vi.fn(),
}));

vi.mock("@shared/db/feedback", () => ({
  getUserFeedback: vi.fn(),
  createFeedbackAtomic: vi.fn(),
  deleteFeedback: vi.fn(),
}));

// Mock auth utilities
vi.mock("@shared/utils/auth", () => ({
  requireAuth: vi.fn((fn) => fn),
  getUserInfo: vi.fn(),
}));

import { getLocation, incrementLikeCount, decrementLikeCount } from "@shared/db/locations";
import { getUserFeedback, createFeedbackAtomic, deleteFeedback } from "@shared/db/feedback";
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
  username: "testuser",
};

// Create mock event
const createMockEvent = (locationId: string): AuthenticatedEvent =>
  ({
    pathParameters: { id: locationId },
    headers: { Authorization: "Bearer token" },
    requestContext: {
      authorizer: {
        claims: {
          sub: sampleUser.id,
          email: sampleUser.email,
          "cognito:username": sampleUser.username,
        },
      },
    },
    body: JSON.stringify({ type: "like" }),
  }) as unknown as AuthenticatedEvent;

const mockContext = {} as Context;

describe("POST /locations/{id}/feedback Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserInfo).mockReturnValue(sampleUser);
    vi.mocked(getLocation).mockResolvedValue(sampleLocation);
  });

  describe("successful like", () => {
    it("should create a like when user has not liked before", async () => {
      vi.mocked(getUserFeedback).mockResolvedValue(null);
      vi.mocked(createFeedbackAtomic).mockResolvedValue({ success: true });
      vi.mocked(incrementLikeCount).mockResolvedValue();

      const event = createMockEvent("loc-123");
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(201);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.action).toBe("added");
      expect(body.data.liked).toBe(true);

      // Verify incrementLikeCount was called
      expect(incrementLikeCount).toHaveBeenCalledWith("loc-123");
    });

    it("should use deterministic feedback ID based on user and location", async () => {
      vi.mocked(getUserFeedback).mockResolvedValue(null);
      vi.mocked(createFeedbackAtomic).mockResolvedValue({ success: true });
      vi.mocked(incrementLikeCount).mockResolvedValue();

      const event = createMockEvent("loc-123");
      await handler(event, mockContext);

      // Verify createFeedbackAtomic was called with deterministic ID
      expect(createFeedbackAtomic).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "user-456_loc-123_like",
          locationId: "loc-123",
          userId: "user-456",
          type: "like",
        })
      );
    });

    it("should remove like when user has already liked (toggle)", async () => {
      const existingFeedback = {
        id: "user-456_loc-123_like",
        locationId: "loc-123",
        userId: "user-456",
        type: "like" as const,
        createdAt: "2024-01-01T00:00:00.000Z",
      };
      vi.mocked(getUserFeedback).mockResolvedValue(existingFeedback);
      vi.mocked(deleteFeedback).mockResolvedValue();
      vi.mocked(decrementLikeCount).mockResolvedValue();

      const event = createMockEvent("loc-123");
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.action).toBe("removed");
      expect(body.data.liked).toBe(false);

      // Verify deleteFeedback and decrementLikeCount were called
      expect(deleteFeedback).toHaveBeenCalledWith("user-456_loc-123_like", "loc-123");
      expect(decrementLikeCount).toHaveBeenCalledWith("loc-123");
    });
  });

  describe("race condition handling", () => {
    it("should handle duplicate like attempts gracefully", async () => {
      // Simulate race condition: getUserFeedback returns null but createFeedbackAtomic fails
      // because another request already created the feedback
      vi.mocked(getUserFeedback).mockResolvedValue(null);
      vi.mocked(createFeedbackAtomic).mockResolvedValue({
        success: false,
        errorCode: "ConditionalCheckFailedException",
      });

      const event = createMockEvent("loc-123");
      const result = await handler(event, mockContext);

      // Should return success indicating already liked, not an error
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.action).toBe("already_exists");
      expect(body.data.liked).toBe(true);

      // incrementLikeCount should NOT be called since like already exists
      expect(incrementLikeCount).not.toHaveBeenCalled();
    });

    it("should not increment like count when atomic write fails", async () => {
      vi.mocked(getUserFeedback).mockResolvedValue(null);
      vi.mocked(createFeedbackAtomic).mockResolvedValue({ success: false });

      const event = createMockEvent("loc-123");
      await handler(event, mockContext);

      // incrementLikeCount should NOT be called
      expect(incrementLikeCount).not.toHaveBeenCalled();
    });
  });

  describe("validation errors", () => {
    it("should return 400 when location ID is missing", async () => {
      const event = {
        pathParameters: {},
        headers: {},
        requestContext: {},
        body: JSON.stringify({ type: "like" }),
      } as unknown as AuthenticatedEvent;

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe("Location ID is required");
    });

    it("should return 404 when location does not exist", async () => {
      vi.mocked(getLocation).mockResolvedValue(null);

      const event = createMockEvent("non-existent");
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

      const event = createMockEvent("loc-123");
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(500);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });
  });
});
