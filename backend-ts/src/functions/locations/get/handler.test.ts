/**
 * Tests for GET /locations Lambda handler.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "./handler";

// Mock the database module
vi.mock("@shared/db/locations", () => ({
  listLocations: vi.fn(),
}));

import { listLocations } from "@shared/db/locations";

// Sample locations
const sampleLocations = [
  {
    id: "loc-1",
    address: "123 Main St, Dallas, TX",
    description: "Beautiful display",
    status: "active",
    lat: 32.7767,
    lng: -96.797,
    likeCount: 15,
  },
  {
    id: "loc-2",
    address: "456 Oak Ave, Plano, TX",
    description: "Amazing lights",
    status: "active",
    lat: 33.0198,
    lng: -96.6989,
    likeCount: 5,
  },
  {
    id: "loc-3",
    address: "789 Pine St, Fort Worth, TX",
    description: "Spectacular show",
    status: "active",
    lat: 32.7555,
    lng: -97.3308,
    likeCount: 25,
  },
];

// Create mock event
const createMockEvent = (
  queryParams: Record<string, string | undefined> = {}
): APIGatewayProxyEvent =>
  ({
    queryStringParameters: queryParams,
    headers: {},
    requestContext: {},
  }) as unknown as APIGatewayProxyEvent;

const mockContext = {} as Context;

describe("GET /locations Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listLocations).mockResolvedValue(sampleLocations);
  });

  describe("successful requests", () => {
    it("should return locations with default parameters", async () => {
      const event = createMockEvent({});
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(3);
      expect(body.pagination).toEqual({
        page: 1,
        pageSize: 50,
        total: 3,
        totalPages: 1,
      });
    });

    it("should filter by search term (address)", async () => {
      const event = createMockEvent({ search: "Dallas" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].address).toContain("Dallas");
    });

    it("should filter by search term (description)", async () => {
      const event = createMockEvent({ search: "Amazing" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].description).toContain("Amazing");
    });

    it("should filter by minimum rating (likeCount)", async () => {
      const event = createMockEvent({ minRating: "5" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.data).toHaveLength(3); // All have likeCount >= 5
      expect(body.data.every((loc: any) => loc.likeCount >= 5)).toBe(true);
    });

    it("should paginate results", async () => {
      const event = createMockEvent({ page: "1", pageSize: "2" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.data).toHaveLength(2);
      expect(body.pagination).toEqual({
        page: 1,
        pageSize: 2,
        total: 3,
        totalPages: 2,
      });
    });

    it("should return second page of results", async () => {
      const event = createMockEvent({ page: "2", pageSize: "2" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe("loc-3");
    });

    it("should pass status filter to database", async () => {
      const event = createMockEvent({ status: "inactive" });
      await handler(event, mockContext);

      expect(listLocations).toHaveBeenCalledWith({ status: "inactive" });
    });

    it("should combine multiple filters", async () => {
      const event = createMockEvent({
        search: "TX",
        minRating: "5",
        page: "1",
        pageSize: "10",
      });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.data.every((loc: any) => loc.likeCount >= 5)).toBe(true);
    });
  });

  describe("empty results", () => {
    it("should return empty array when no locations match", async () => {
      const event = createMockEvent({ search: "NonExistentAddress" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.data).toEqual([]);
      expect(body.pagination.total).toBe(0);
    });

    it("should return empty array when database is empty", async () => {
      vi.mocked(listLocations).mockResolvedValue([]);

      const event = createMockEvent({});
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.data).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("should return 500 on database error", async () => {
      vi.mocked(listLocations).mockRejectedValue(new Error("Database error"));

      const event = createMockEvent({});
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(500);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
  });

  describe("CORS headers", () => {
    it("should include CORS headers in response", async () => {
      const event = createMockEvent({});
      const result = await handler(event, mockContext);

      expect(result.headers).toBeDefined();
      expect(result.headers?.["Access-Control-Allow-Origin"]).toBeDefined();
    });
  });
});
