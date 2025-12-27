/**
 * Tests for validation utilities.
 */

import { describe, it, expect } from "vitest";
import {
  createLocationSchema,
  createRouteSchema,
  submitSuggestionSchema,
  parseJsonBody,
  parseQueryParams,
  listLocationsQuerySchema,
} from "./validation";

describe("Validation Schemas", () => {
  describe("createLocationSchema", () => {
    it("should validate a valid location", () => {
      const input = {
        address: "123 Main St, Dallas, TX",
        lat: 32.7767,
        lng: -96.797,
        description: "Beautiful lights display",
      };

      const result = createLocationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject invalid latitude", () => {
      const input = {
        address: "123 Main St",
        lat: 100, // Invalid
        lng: -96.797,
      };

      const result = createLocationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject invalid longitude", () => {
      const input = {
        address: "123 Main St",
        lat: 32.7767,
        lng: -200, // Invalid
      };

      const result = createLocationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should default photos to empty array", () => {
      const input = {
        address: "123 Main St",
        lat: 32.7767,
        lng: -96.797,
      };

      const result = createLocationSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.photos).toEqual([]);
      }
    });
  });

  describe("createRouteSchema", () => {
    it("should validate a valid route", () => {
      const input = {
        title: "Holiday Tour",
        description: "A great route through the neighborhood",
        locationIds: ["loc1", "loc2", "loc3"],
        tags: ["family-friendly"],
      };

      const result = createRouteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should require at least one location", () => {
      const input = {
        title: "Empty Route",
        locationIds: [],
      };

      const result = createRouteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should limit to 20 locations", () => {
      const input = {
        title: "Too Long Route",
        locationIds: Array(21).fill("loc"),
      };

      const result = createRouteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should require a title", () => {
      const input = {
        title: "",
        locationIds: ["loc1"],
      };

      const result = createRouteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("submitSuggestionSchema", () => {
    it("should validate a valid suggestion", () => {
      const input = {
        address: "456 Oak Lane",
        description: "Amazing display with animated figures",
        photos: ["photo1.jpg"],
      };

      const result = submitSuggestionSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should limit to 3 photos", () => {
      const input = {
        address: "456 Oak Lane",
        photos: ["p1", "p2", "p3", "p4"],
      };

      const result = submitSuggestionSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("parseJsonBody", () => {
    it("should parse valid JSON", () => {
      const body = JSON.stringify({ address: "123 Main St", lat: 32.7, lng: -96.8 });
      const result = parseJsonBody(body, createLocationSchema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.address).toBe("123 Main St");
      }
    });

    it("should return error for invalid JSON", () => {
      const result = parseJsonBody("not valid json", createLocationSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.body).toBe("Invalid JSON in request body");
      }
    });

    it("should return error for null body", () => {
      const result = parseJsonBody(null, createLocationSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.body).toBe("Request body is required");
      }
    });
  });

  describe("parseQueryParams", () => {
    it("should parse valid query params", () => {
      const params = { page: "2", pageSize: "25", status: "active" };
      const result = parseQueryParams(params, listLocationsQuerySchema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.pageSize).toBe(25);
      }
    });

    it("should use defaults for missing params", () => {
      const result = parseQueryParams({}, listLocationsQuerySchema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(50);
        expect(result.data.status).toBe("active");
      }
    });

    it("should handle null params", () => {
      const result = parseQueryParams(null, listLocationsQuerySchema);

      expect(result.success).toBe(true);
    });
  });
});
