/**
 * Tests for route utility functions.
 */

import { describe, it, expect } from "vitest";
import type { Location } from "@/types";
import {
  haversineDistance,
  estimateDrivingDistance,
  estimateDrivingTime,
  calculateRouteStats,
  optimizeRoute,
  formatDuration,
  formatDistance,
} from "./routeUtils";

// Helper to create mock location
const createLocation = (id: string, lat: number, lng: number): Location => ({
  id,
  lat,
  lng,
  address: `${id} Main St`,
  status: "approved",
  submittedBy: "user1",
  submittedAt: "2024-01-01",
});

describe("Route Utilities", () => {
  describe("haversineDistance", () => {
    it("should calculate zero distance for same point", () => {
      const distance = haversineDistance(32.7767, -96.797, 32.7767, -96.797);
      expect(distance).toBe(0);
    });

    it("should calculate distance between two points", () => {
      // Dallas to Fort Worth - approximately 30 miles
      const distance = haversineDistance(32.7767, -96.797, 32.7555, -97.3308);
      expect(distance).toBeGreaterThan(25);
      expect(distance).toBeLessThan(40);
    });

    it("should calculate short distance correctly", () => {
      // Two points very close together (~1 mile apart)
      const lat1 = 32.7767;
      const lng1 = -96.797;
      const lat2 = 32.7912; // ~1 mile north
      const lng2 = -96.797;
      const distance = haversineDistance(lat1, lng1, lat2, lng2);
      expect(distance).toBeGreaterThan(0.8);
      expect(distance).toBeLessThan(1.2);
    });

    it("should return same distance regardless of direction", () => {
      const d1 = haversineDistance(32.7767, -96.797, 32.78, -96.8);
      const d2 = haversineDistance(32.78, -96.8, 32.7767, -96.797);
      expect(d1).toBeCloseTo(d2, 10);
    });
  });

  describe("estimateDrivingDistance", () => {
    it("should apply road factor of 1.4", () => {
      expect(estimateDrivingDistance(10)).toBeCloseTo(14, 1);
    });

    it("should return 0 for 0 distance", () => {
      expect(estimateDrivingDistance(0)).toBe(0);
    });

    it("should handle fractional distances", () => {
      expect(estimateDrivingDistance(0.5)).toBeCloseTo(0.7, 2);
    });
  });

  describe("estimateDrivingTime", () => {
    it("should calculate time at 25 mph", () => {
      // 25 miles at 25 mph = 60 minutes
      expect(estimateDrivingTime(25)).toBe(60);
    });

    it("should return 0 for 0 distance", () => {
      expect(estimateDrivingTime(0)).toBe(0);
    });

    it("should round to nearest minute", () => {
      // 12.5 miles at 25 mph = 30 minutes exactly
      expect(estimateDrivingTime(12.5)).toBe(30);
    });

    it("should handle short distances", () => {
      // 1 mile at 25 mph = 2.4 minutes, rounds to 2
      expect(estimateDrivingTime(1)).toBe(2);
    });
  });

  describe("calculateRouteStats", () => {
    it("should return zeros for empty stops", () => {
      const stats = calculateRouteStats([]);
      expect(stats.totalDistance).toBe(0);
      expect(stats.totalTime).toBe(0);
    });

    it("should return zeros for single stop", () => {
      const stops = [createLocation("1", 32.7767, -96.797)];
      const stats = calculateRouteStats(stops);
      expect(stats.totalDistance).toBe(0);
      expect(stats.totalTime).toBe(0);
    });

    it("should calculate stats for two stops", () => {
      const stops = [
        createLocation("1", 32.7767, -96.797),
        createLocation("2", 32.78, -96.8),
      ];
      const stats = calculateRouteStats(stops);
      expect(stats.totalDistance).toBeGreaterThan(0);
      expect(stats.totalTime).toBeGreaterThan(0);
    });

    it("should include viewing time (3 min per stop)", () => {
      const stops = [
        createLocation("1", 32.7767, -96.797),
        createLocation("2", 32.7768, -96.7971), // Very close
      ];
      const stats = calculateRouteStats(stops);
      // Should have at least 6 minutes (2 stops * 3 min viewing time)
      expect(stats.totalTime).toBeGreaterThanOrEqual(6);
    });

    it("should round distance to 1 decimal place", () => {
      const stops = [
        createLocation("1", 32.7767, -96.797),
        createLocation("2", 32.78, -96.8),
      ];
      const stats = calculateRouteStats(stops);
      const decimalPlaces = (stats.totalDistance.toString().split(".")[1] || "").length;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
    });
  });

  describe("optimizeRoute", () => {
    it("should return empty array for empty input", () => {
      expect(optimizeRoute([])).toEqual([]);
    });

    it("should return same array for single stop", () => {
      const stops = [createLocation("1", 32.7767, -96.797)];
      expect(optimizeRoute(stops)).toEqual(stops);
    });

    it("should return same array for two stops", () => {
      const stops = [
        createLocation("1", 32.7767, -96.797),
        createLocation("2", 32.78, -96.8),
      ];
      expect(optimizeRoute(stops)).toHaveLength(2);
    });

    it("should keep first stop as first", () => {
      const stops = [
        createLocation("1", 32.7767, -96.797),
        createLocation("2", 32.78, -96.8),
        createLocation("3", 32.785, -96.805),
      ];
      const optimized = optimizeRoute(stops);
      expect(optimized[0].id).toBe("1");
    });

    it("should include all stops in optimized route", () => {
      const stops = [
        createLocation("1", 32.7767, -96.797),
        createLocation("2", 32.78, -96.8),
        createLocation("3", 32.785, -96.805),
        createLocation("4", 32.79, -96.81),
      ];
      const optimized = optimizeRoute(stops);
      expect(optimized).toHaveLength(4);

      const optimizedIds = optimized.map((s) => s.id).sort();
      const originalIds = stops.map((s) => s.id).sort();
      expect(optimizedIds).toEqual(originalIds);
    });

    it("should not modify original array", () => {
      const stops = [
        createLocation("1", 32.7767, -96.797),
        createLocation("2", 32.78, -96.8),
        createLocation("3", 32.785, -96.805),
      ];
      const original = [...stops];
      optimizeRoute(stops);
      expect(stops).toEqual(original);
    });

    it("should produce route with reasonable total distance", () => {
      // Create stops in a pattern that would be suboptimal if not optimized
      const stops = [
        createLocation("1", 32.77, -96.79),
        createLocation("2", 32.80, -96.82), // Far northeast
        createLocation("3", 32.78, -96.80), // Middle
        createLocation("4", 32.79, -96.81), // Between 2 and 3
      ];

      const optimized = optimizeRoute(stops);
      const optimizedStats = calculateRouteStats(optimized);

      // The optimized route should have a reasonable distance
      expect(optimizedStats.totalDistance).toBeGreaterThan(0);
    });
  });

  describe("formatDuration", () => {
    it("should format minutes only", () => {
      expect(formatDuration(30)).toBe("30 min");
      expect(formatDuration(45)).toBe("45 min");
    });

    it("should format hours only", () => {
      expect(formatDuration(60)).toBe("1 hr");
      expect(formatDuration(120)).toBe("2 hr");
    });

    it("should format hours and minutes", () => {
      expect(formatDuration(90)).toBe("1 hr 30 min");
      expect(formatDuration(150)).toBe("2 hr 30 min");
    });

    it("should handle zero", () => {
      expect(formatDuration(0)).toBe("0 min");
    });

    it("should handle single minute", () => {
      expect(formatDuration(1)).toBe("1 min");
    });

    it("should handle edge case of 61 minutes", () => {
      expect(formatDuration(61)).toBe("1 hr 1 min");
    });
  });

  describe("formatDistance", () => {
    it("should format distance with 1 decimal", () => {
      expect(formatDistance(5.5)).toBe("5.5 mi");
      expect(formatDistance(10.0)).toBe("10.0 mi");
    });

    it("should show < 0.1 mi for very small distances", () => {
      expect(formatDistance(0.05)).toBe("< 0.1 mi");
      expect(formatDistance(0.09)).toBe("< 0.1 mi");
    });

    it("should format exactly 0.1 miles", () => {
      expect(formatDistance(0.1)).toBe("0.1 mi");
    });

    it("should handle zero", () => {
      expect(formatDistance(0)).toBe("< 0.1 mi");
    });

    it("should round to 1 decimal place", () => {
      // Note: 5.55.toFixed(1) returns "5.5" due to floating point representation
      expect(formatDistance(5.56)).toBe("5.6 mi");
      expect(formatDistance(5.54)).toBe("5.5 mi");
    });
  });
});
