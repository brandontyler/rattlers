/**
 * Tests for GET /locations/trending Lambda handler.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "./handler";

// Mock the database modules
vi.mock("@shared/db/checkins", () => ({
  getRecentCheckIns: vi.fn(),
}));

vi.mock("@shared/db/locations", () => ({
  listLocations: vi.fn(),
}));

import { getRecentCheckIns } from "@shared/db/checkins";
import { listLocations } from "@shared/db/locations";

// Sample data
const sampleLocations = [
  {
    id: "loc-1",
    address: "123 Main St, Dallas, TX",
    lat: 32.7767,
    lng: -96.797,
    status: "active",
    likeCount: 10,
    photos: ["photo1.jpg"],
    description: "Beautiful lights",
    createdAt: "2024-12-01T00:00:00.000Z",
    updatedAt: "2024-12-01T00:00:00.000Z",
    reportCount: 0,
    viewCount: 100,
    saveCount: 5,
  },
  {
    id: "loc-2",
    address: "456 Oak Ave, Plano, TX",
    lat: 33.0198,
    lng: -96.6989,
    status: "active",
    likeCount: 25,
    photos: [],
    description: "Spectacular display",
    createdAt: "2024-12-01T00:00:00.000Z",
    updatedAt: "2024-12-01T00:00:00.000Z",
    reportCount: 0,
    viewCount: 200,
    saveCount: 10,
  },
  {
    id: "loc-3",
    address: "789 Elm St, Frisco, TX",
    lat: 33.1507,
    lng: -96.8236,
    status: "active",
    likeCount: 5,
    photos: ["photo3.jpg"],
    description: "Nice display",
    createdAt: "2024-12-01T00:00:00.000Z",
    updatedAt: "2024-12-01T00:00:00.000Z",
    reportCount: 0,
    viewCount: 50,
    saveCount: 2,
  },
];

const now = new Date();
const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();
const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

const sampleCheckIns = [
  // loc-1: 1 amazing (recent)
  {
    id: "checkin-1",
    locationId: "loc-1",
    userId: "user-1",
    username: "TestUser1",
    status: "amazing",
    createdAt: oneHourAgo,
  },
  // loc-2: 2 check-ins (on + amazing)
  {
    id: "checkin-2",
    locationId: "loc-2",
    userId: "user-2",
    username: "TestUser2",
    status: "on",
    createdAt: oneHourAgo,
  },
  {
    id: "checkin-3",
    locationId: "loc-2",
    userId: "user-3",
    username: "TestUser3",
    status: "amazing",
    createdAt: oneDayAgo,
  },
  // loc-3: 1 off (less valuable)
  {
    id: "checkin-4",
    locationId: "loc-3",
    userId: "user-4",
    username: "TestUser4",
    status: "off",
    createdAt: twoDaysAgo,
  },
];

// Create mock event
const createMockEvent = (
  queryParams: Record<string, string> = {}
): APIGatewayProxyEvent =>
  ({
    pathParameters: {},
    headers: {},
    queryStringParameters: queryParams,
    requestContext: {},
    body: null,
  }) as unknown as APIGatewayProxyEvent;

const mockContext = {} as Context;

describe("GET /locations/trending Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listLocations).mockResolvedValue(sampleLocations);
    vi.mocked(getRecentCheckIns).mockResolvedValue(sampleCheckIns);
  });

  describe("successful requests", () => {
    it("should return trending locations sorted by score", async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(3);

      // loc-2 should be first (2 check-ins with recent activity)
      expect(body.data[0].id).toBe("loc-2");
      expect(body.data[0].trendingScore).toBeGreaterThan(0);
      expect(body.data[0].recentCheckInCount).toBe(2);

      // loc-1 should be second (1 amazing check-in)
      expect(body.data[1].id).toBe("loc-1");
      expect(body.data[1].recentCheckInCount).toBe(1);

      // loc-3 should be last (1 off check-in with decay)
      expect(body.data[2].id).toBe("loc-3");
    });

    it("should include latest check-in status", async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      const body = JSON.parse(result.body);
      expect(body.data[0].latestCheckInStatus).toBe("on");
      expect(body.data[0].latestCheckInAt).toBeDefined();
    });

    it("should include meta information", async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      const body = JSON.parse(result.body);
      expect(body.meta).toBeDefined();
      expect(body.meta.days).toBe(7);
      expect(body.meta.limit).toBe(10);
      expect(body.meta.totalCheckIns).toBe(4);
      expect(body.meta.locationsWithActivity).toBe(3);
    });

    it("should respect limit parameter", async () => {
      const event = createMockEvent({ limit: "2" });
      const result = await handler(event, mockContext);

      const body = JSON.parse(result.body);
      expect(body.data).toHaveLength(2);
      expect(body.meta.limit).toBe(2);
    });

    it("should respect days parameter", async () => {
      const event = createMockEvent({ days: "3" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.meta.days).toBe(3);
    });

    it("should cap limit at 50", async () => {
      const event = createMockEvent({ limit: "100" });
      const result = await handler(event, mockContext);

      const body = JSON.parse(result.body);
      expect(body.meta.limit).toBe(50);
    });

    it("should cap days at 30", async () => {
      const event = createMockEvent({ days: "60" });
      const result = await handler(event, mockContext);

      const body = JSON.parse(result.body);
      expect(body.meta.days).toBe(30);
    });
  });

  describe("empty results", () => {
    it("should return empty array when no recent check-ins", async () => {
      vi.mocked(getRecentCheckIns).mockResolvedValue([]);

      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
      expect(body.meta.totalCheckIns).toBe(0);
    });

    it("should handle invalid limit parameter gracefully", async () => {
      const event = createMockEvent({ limit: "invalid" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.data).toEqual([]);
    });

    it("should handle invalid days parameter gracefully", async () => {
      const event = createMockEvent({ days: "invalid" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.data).toEqual([]);
    });
  });

  describe("trending score calculation", () => {
    it("should weight 'amazing' status higher than 'on'", async () => {
      // Set up check-ins with same recency but different status
      const equalRecencyCheckIns = [
        {
          id: "checkin-a",
          locationId: "loc-1",
          userId: "user-1",
          username: "User1",
          status: "on",
          createdAt: oneHourAgo,
        },
        {
          id: "checkin-b",
          locationId: "loc-2",
          userId: "user-2",
          username: "User2",
          status: "amazing",
          createdAt: oneHourAgo,
        },
      ];

      vi.mocked(getRecentCheckIns).mockResolvedValue(equalRecencyCheckIns);

      const event = createMockEvent();
      const result = await handler(event, mockContext);

      const body = JSON.parse(result.body);

      // loc-2 with 'amazing' should score higher than loc-1 with 'on'
      expect(body.data[0].id).toBe("loc-2");
      expect(body.data[1].id).toBe("loc-1");
      expect(body.data[0].trendingScore).toBeGreaterThan(body.data[1].trendingScore);
    });

    it("should apply recency decay", async () => {
      // Same status but different times
      const decayCheckIns = [
        {
          id: "checkin-a",
          locationId: "loc-1",
          userId: "user-1",
          username: "User1",
          status: "on",
          createdAt: oneHourAgo, // Recent
        },
        {
          id: "checkin-b",
          locationId: "loc-2",
          userId: "user-2",
          username: "User2",
          status: "on",
          createdAt: twoDaysAgo, // Older
        },
      ];

      vi.mocked(getRecentCheckIns).mockResolvedValue(decayCheckIns);

      const event = createMockEvent();
      const result = await handler(event, mockContext);

      const body = JSON.parse(result.body);

      // loc-1 with recent check-in should score higher
      expect(body.data[0].id).toBe("loc-1");
      expect(body.data[0].trendingScore).toBeGreaterThan(body.data[1].trendingScore);
    });
  });

  describe("error handling", () => {
    it("should return 500 on database error", async () => {
      vi.mocked(getRecentCheckIns).mockRejectedValue(new Error("Database error"));

      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(500);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });
  });
});
