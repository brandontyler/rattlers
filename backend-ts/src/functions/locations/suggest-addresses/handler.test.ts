/**
 * Tests for POST /locations/suggest-addresses Lambda handler.
 * Tests the AWS Location Service V2 Places API integration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";

// Create mock send function using vi.hoisted to ensure it's available for the mock
const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

// Mock the AWS SDK before importing handler
vi.mock("@aws-sdk/client-geo-places", () => ({
  GeoPlacesClient: vi.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  AutocompleteCommand: vi.fn().mockImplementation((input) => ({ input, type: "Autocomplete" })),
  GetPlaceCommand: vi.fn().mockImplementation((input) => ({ input, type: "GetPlace" })),
}));

import { handler } from "./handler";

// Sample autocomplete response from V2 API
// Note: Autocomplete returns PlaceId directly on the result item (not nested in Place object)
const createAutocompleteResponse = (places: Array<{ placeId: string; title: string }>) => ({
  ResultItems: places.map((p) => ({
    Title: p.title,
    PlaceId: p.placeId,
    PlaceType: "Address",
  })),
});

// Sample GetPlace response from V2 API
const createPlaceResponse = (data: {
  title: string;
  lat: number;
  lng: number;
  addressNumber?: string;
  street?: string;
  locality?: string;
  region?: string;
}) => ({
  Title: data.title,
  Position: [data.lng, data.lat],
  Address: {
    AddressNumber: data.addressNumber,
    Street: data.street,
    Locality: data.locality,
    Region: data.region ? { Name: data.region } : undefined,
  },
});

// Create mock event
const createMockEvent = (body: Record<string, unknown>): APIGatewayProxyEvent =>
  ({
    body: JSON.stringify(body),
    headers: {},
    requestContext: {},
  }) as unknown as APIGatewayProxyEvent;

const mockContext = {} as Context;

describe("POST /locations/suggest-addresses Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockSend.mockReset();
  });

  describe("input validation", () => {
    it("should return 400 for missing query", async () => {
      const event = createMockEvent({});
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain("Query parameter is required");
    });

    it("should return 400 for empty query", async () => {
      const event = createMockEvent({ query: "" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain("Query parameter is required");
    });

    it("should return 400 for query too short", async () => {
      const event = createMockEvent({ query: "ab" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain("at least 3 characters");
    });

    it("should return 400 for invalid JSON body", async () => {
      const event = {
        body: "not valid json",
        headers: {},
        requestContext: {},
      } as unknown as APIGatewayProxyEvent;

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain("Invalid JSON");
    });

    it("should trim whitespace from query", async () => {
      mockSend.mockResolvedValueOnce({ ResultItems: [] });

      const event = createMockEvent({ query: "   123 Main   " });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.query).toBe("123 Main");
    });
  });

  describe("successful suggestions", () => {
    it("should return suggestions with coordinates", async () => {
      // Mock Suggest response
      mockSend.mockResolvedValueOnce(
        createAutocompleteResponse([
          { placeId: "place-1", title: "123 Main St, Dallas, TX" },
        ])
      );

      // Mock GetPlace response
      mockSend.mockResolvedValueOnce(
        createPlaceResponse({
          title: "123 Main St, Dallas, TX",
          lat: 32.7767,
          lng: -96.797,
          addressNumber: "123",
          street: "Main St",
          locality: "Dallas",
          region: "Texas",
        })
      );

      const event = createMockEvent({ query: "123 Main St Dallas" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.suggestions).toHaveLength(1);
      expect(body.data.suggestions[0]).toEqual({
        address: "123 Main St, Dallas, Texas",
        lat: 32.7767,
        lng: -96.797,
        displayName: "123 Main St, Dallas, Texas",
      });
    });

    it("should return multiple suggestions", async () => {
      mockSend.mockResolvedValueOnce(
        createAutocompleteResponse([
          { placeId: "place-1", title: "123 Main St" },
          { placeId: "place-2", title: "456 Oak Ave" },
        ])
      );

      // Mock GetPlace for first result
      mockSend.mockResolvedValueOnce(
        createPlaceResponse({
          title: "123 Main St",
          lat: 32.78,
          lng: -96.80,
          addressNumber: "123",
          street: "Main St",
          locality: "Dallas",
          region: "TX",
        })
      );

      // Mock GetPlace for second result
      mockSend.mockResolvedValueOnce(
        createPlaceResponse({
          title: "456 Oak Ave",
          lat: 33.01,
          lng: -96.69,
          addressNumber: "456",
          street: "Oak Ave",
          locality: "Plano",
          region: "TX",
        })
      );

      const event = createMockEvent({ query: "main street" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.suggestions).toHaveLength(2);
    });

    it("should return empty suggestions for no results", async () => {
      mockSend.mockResolvedValueOnce({ ResultItems: [] });

      const event = createMockEvent({ query: "nonexistent address xyz" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.suggestions).toEqual([]);
    });

    it("should include query in response", async () => {
      mockSend.mockResolvedValueOnce({ ResultItems: [] });

      const event = createMockEvent({ query: "test query" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.query).toBe("test query");
    });
  });

  describe("geographic filtering", () => {
    it("should filter out locations outside North Texas bounds", async () => {
      mockSend.mockResolvedValueOnce(
        createAutocompleteResponse([
          { placeId: "place-1", title: "Dallas Address" },
          { placeId: "place-2", title: "Houston Address" },
        ])
      );

      // Dallas - inside bounds
      mockSend.mockResolvedValueOnce(
        createPlaceResponse({
          title: "Dallas Address",
          lat: 32.7767,
          lng: -96.797,
          locality: "Dallas",
          region: "TX",
        })
      );

      // Houston - outside bounds (too far south)
      mockSend.mockResolvedValueOnce(
        createPlaceResponse({
          title: "Houston Address",
          lat: 29.7604, // Below minLat of 31.5
          lng: -95.3698,
          locality: "Houston",
          region: "TX",
        })
      );

      const event = createMockEvent({ query: "test address" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.suggestions).toHaveLength(1);
      expect(body.data.suggestions[0].address).toContain("Dallas");
    });

    it("should exclude locations with null coordinates (regression test for Dec 29, 2025 bug)", async () => {
      // Bug: Suggestions with null coordinates caused frontend crashes when
      // calling .toFixed() on null values in AddressAutocomplete.tsx
      // Fix: Filter out suggestions without valid coordinates since they're
      // not useful for geocoding anyway
      mockSend.mockResolvedValueOnce(
        createAutocompleteResponse([{ placeId: "place-1", title: "Unknown Location" }])
      );

      // Response without Position (null coordinates)
      mockSend.mockResolvedValueOnce({
        Title: "Unknown Location",
        Address: { Locality: "Unknown" },
      });

      const event = createMockEvent({ query: "unknown location" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      // Should filter out suggestions without valid coordinates
      expect(body.data.suggestions).toHaveLength(0);
    });
  });

  describe("deduplication", () => {
    it("should remove duplicate addresses", async () => {
      mockSend.mockResolvedValueOnce(
        createAutocompleteResponse([
          { placeId: "place-1", title: "123 Main St" },
          { placeId: "place-2", title: "123 Main St Duplicate" },
        ])
      );

      // Both return same address
      mockSend.mockResolvedValueOnce(
        createPlaceResponse({
          title: "123 Main St",
          lat: 32.78,
          lng: -96.80,
          addressNumber: "123",
          street: "Main St",
          locality: "Dallas",
          region: "TX",
        })
      );

      mockSend.mockResolvedValueOnce(
        createPlaceResponse({
          title: "123 Main St",
          lat: 32.78,
          lng: -96.80,
          addressNumber: "123",
          street: "Main St",
          locality: "Dallas",
          region: "TX",
        })
      );

      const event = createMockEvent({ query: "123 main" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.suggestions).toHaveLength(1);
    });
  });

  describe("error handling", () => {
    it("should handle GetPlace failure by excluding that suggestion", async () => {
      mockSend.mockResolvedValueOnce(
        createAutocompleteResponse([{ placeId: "place-1", title: "123 Main St" }])
      );

      // GetPlace fails
      mockSend.mockRejectedValueOnce(new Error("GetPlace failed"));

      const event = createMockEvent({ query: "123 Main St" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      // GetPlace failure results in null coordinates, which are filtered out
      // since they're not useful for geocoding
      expect(body.data.suggestions).toHaveLength(0);
    });

    it("should return 503 for AccessDeniedException", async () => {
      const error = new Error("Access denied");
      (error as any).name = "AccessDeniedException";
      mockSend.mockRejectedValueOnce(error);

      const event = createMockEvent({ query: "123 Main St" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(503);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain("access denied");
    });

    it("should return 503 for ResourceNotFoundException", async () => {
      const error = new Error("Resource not found");
      (error as any).name = "ResourceNotFoundException";
      mockSend.mockRejectedValueOnce(error);

      const event = createMockEvent({ query: "123 Main St" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(503);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain("not configured");
    });

    it("should return 503 for other AWS errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("Unknown AWS error"));

      const event = createMockEvent({ query: "123 Main St" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(503);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain("temporarily unavailable");
    });
  });

  describe("address formatting", () => {
    it("should format address with all components", async () => {
      mockSend.mockResolvedValueOnce(
        createAutocompleteResponse([{ placeId: "place-1", title: "Full Address" }])
      );

      mockSend.mockResolvedValueOnce(
        createPlaceResponse({
          title: "Full Address",
          lat: 32.78,
          lng: -96.80,
          addressNumber: "123",
          street: "Main St",
          locality: "Dallas",
          region: "Texas",
        })
      );

      const event = createMockEvent({ query: "123 main" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.suggestions[0].displayName).toBe("123 Main St, Dallas, Texas");
    });

    it("should handle missing address components", async () => {
      mockSend.mockResolvedValueOnce(
        createAutocompleteResponse([{ placeId: "place-1", title: "Partial Address" }])
      );

      mockSend.mockResolvedValueOnce({
        Title: "Partial Address",
        Position: [-96.80, 32.78],
        Address: {
          Street: "Main St",
          // No AddressNumber, Locality, or Region
        },
      });

      const event = createMockEvent({ query: "main st" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.suggestions[0].displayName).toBe("Main St");
    });

    it("should use Title as fallback when no address components", async () => {
      mockSend.mockResolvedValueOnce(
        createAutocompleteResponse([{ placeId: "place-1", title: "Some Place" }])
      );

      mockSend.mockResolvedValueOnce({
        Title: "Some Place Title",
        Position: [-96.80, 32.78],
        Address: {},
      });

      const event = createMockEvent({ query: "some place" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.suggestions[0].displayName).toBe("Some Place Title");
    });
  });

  describe("suggestions without PlaceId", () => {
    it("should exclude suggestions without PlaceId (no coordinates available)", async () => {
      // Suggestions without PlaceId cannot be geocoded and are filtered out
      mockSend.mockResolvedValueOnce({
        ResultItems: [
          {
            Title: "Query Suggestion",
            // No Place object with PlaceId
          },
        ],
      });

      const event = createMockEvent({ query: "query suggestion" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      // Should filter out since no coordinates can be obtained
      expect(body.data.suggestions).toHaveLength(0);
    });
  });

  describe("null coordinate filtering (Dec 29, 2025 regression test)", () => {
    // This regression test suite documents the Dec 29, 2025 bug where suggestions
    // with null coordinates caused the frontend AddressAutocomplete component
    // to crash when calling .toFixed() on null lat/lng values.

    it("should only return suggestions with valid lat/lng coordinates", async () => {
      // Simulate mixed results: some with coords, some without
      mockSend.mockResolvedValueOnce(
        createAutocompleteResponse([
          { placeId: "place-1", title: "Good Address" },
          { placeId: "place-2", title: "Bad Address" },
        ])
      );

      // First place has valid coordinates
      mockSend.mockResolvedValueOnce(
        createPlaceResponse({
          title: "Good Address",
          lat: 32.78,
          lng: -96.80,
          addressNumber: "123",
          street: "Main St",
          locality: "Dallas",
          region: "TX",
        })
      );

      // Second place has no Position (null coordinates)
      mockSend.mockResolvedValueOnce({
        Title: "Bad Address",
        Address: { Locality: "Unknown" },
        // No Position field - lat/lng will be null
      });

      const event = createMockEvent({ query: "test address" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);

      // Only the suggestion with valid coordinates should be returned
      expect(body.data.suggestions).toHaveLength(1);
      expect(body.data.suggestions[0].address).toBe("123 Main St, Dallas, TX");
      expect(body.data.suggestions[0].lat).toBe(32.78);
      expect(body.data.suggestions[0].lng).toBe(-96.80);
    });

    it("should return empty array when all suggestions have null coordinates", async () => {
      mockSend.mockResolvedValueOnce(
        createAutocompleteResponse([{ placeId: "place-1", title: "No Coords" }])
      );

      // Response without Position
      mockSend.mockResolvedValueOnce({
        Title: "No Coords",
        Address: {},
      });

      const event = createMockEvent({ query: "no coords" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.suggestions).toHaveLength(0);
    });
  });

  describe("street address suggestions (Dec 29, 2025 regression test)", () => {
    // This regression test documents the Dec 29, 2025 bug where street address
    // queries like "424 headlee st" would not return any suggestions.
    // Bug: The Suggest API was being used instead of Autocomplete API
    // The Suggest API is designed for broader query predictions and POIs,
    // while Autocomplete is specifically designed for address completion.
    // Fix: Switched from SuggestCommand to AutocompleteCommand

    it("should return suggestions for partial street address queries", async () => {
      // Mock autocomplete response for a partial street address
      mockSend.mockResolvedValueOnce(
        createAutocompleteResponse([
          { placeId: "place-headlee-1", title: "424 Headlee St, Lewisville, TX 75057" },
          { placeId: "place-headlee-2", title: "426 Headlee St, Lewisville, TX 75057" },
        ])
      );

      // Mock GetPlace responses with coordinates
      mockSend.mockResolvedValueOnce(
        createPlaceResponse({
          title: "424 Headlee St, Lewisville, TX 75057",
          lat: 33.0462,
          lng: -96.9942,
          addressNumber: "424",
          street: "Headlee St",
          locality: "Lewisville",
          region: "TX",
        })
      );
      mockSend.mockResolvedValueOnce(
        createPlaceResponse({
          title: "426 Headlee St, Lewisville, TX 75057",
          lat: 33.0463,
          lng: -96.9943,
          addressNumber: "426",
          street: "Headlee St",
          locality: "Lewisville",
          region: "TX",
        })
      );

      const event = createMockEvent({ query: "424 headlee st" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.suggestions.length).toBeGreaterThan(0);
      expect(body.data.suggestions[0].address).toContain("Headlee");
      expect(body.data.suggestions[0].lat).toBeDefined();
      expect(body.data.suggestions[0].lng).toBeDefined();
    });

    it("should return suggestions for number-prefixed street addresses", async () => {
      // Ensure addresses starting with numbers are handled correctly
      mockSend.mockResolvedValueOnce(
        createAutocompleteResponse([
          { placeId: "place-1", title: "123 Main St, Dallas, TX" },
        ])
      );

      mockSend.mockResolvedValueOnce(
        createPlaceResponse({
          title: "123 Main St, Dallas, TX",
          lat: 32.78,
          lng: -96.80,
          addressNumber: "123",
          street: "Main St",
          locality: "Dallas",
          region: "TX",
        })
      );

      const event = createMockEvent({ query: "123 main" });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.suggestions.length).toBe(1);
      expect(body.data.suggestions[0].address).toBe("123 Main St, Dallas, TX");
    });
  });

  describe("CORS headers", () => {
    it("should include CORS headers in response", async () => {
      mockSend.mockResolvedValueOnce({ ResultItems: [] });

      const event = createMockEvent({ query: "test" });
      const result = await handler(event, mockContext);

      expect(result.headers).toBeDefined();
      expect(result.headers?.["Access-Control-Allow-Origin"]).toBeDefined();
    });
  });
});
