/**
 * Tests for address utility functions.
 */

import { describe, it, expect } from "vitest";
import { getShortAddress, getDirectionsUrl } from "./address";

describe("Address Utilities", () => {
  describe("getShortAddress", () => {
    it("should extract street address from full address", () => {
      const result = getShortAddress("314 Magnolia St, Denton, TX 76201, USA");
      expect(result).toBe("314 Magnolia St");
    });

    it("should handle address with multiple commas", () => {
      const result = getShortAddress("123 Main Street, Apt 4B, Dallas, TX 75201, USA");
      expect(result).toBe("123 Main Street");
    });

    it("should return empty string for empty input", () => {
      expect(getShortAddress("")).toBe("");
    });

    it("should return empty string for undefined-like falsy values", () => {
      expect(getShortAddress(null as unknown as string)).toBe("");
      expect(getShortAddress(undefined as unknown as string)).toBe("");
    });

    it("should handle address without commas", () => {
      const result = getShortAddress("123 Main Street");
      expect(result).toBe("123 Main Street");
    });

    it("should trim whitespace from result", () => {
      const result = getShortAddress("  123 Main St  , Dallas, TX");
      expect(result).toBe("123 Main St");
    });
  });

  describe("getDirectionsUrl", () => {
    it("should generate URL with encoded address", () => {
      const result = getDirectionsUrl("123 Main St, Dallas, TX");
      expect(result).toBe(
        "https://www.google.com/maps/dir/?api=1&destination=123%20Main%20St%2C%20Dallas%2C%20TX"
      );
    });

    it("should handle special characters in address", () => {
      const result = getDirectionsUrl("456 Oak Ave & Elm St, Fort Worth, TX");
      expect(result).toContain("destination=");
      expect(result).toContain(encodeURIComponent("456 Oak Ave & Elm St, Fort Worth, TX"));
    });

    it("should fallback to coordinates when no address provided", () => {
      const result = getDirectionsUrl("", 32.7767, -96.797);
      expect(result).toBe("https://www.google.com/maps/dir/?api=1&destination=32.7767,-96.797");
    });

    it("should prefer address over coordinates when both provided", () => {
      const result = getDirectionsUrl("123 Main St", 32.7767, -96.797);
      expect(result).toContain("destination=123%20Main%20St");
      expect(result).not.toContain("32.7767");
    });

    it("should return empty string when no address or coordinates", () => {
      expect(getDirectionsUrl("")).toBe("");
      expect(getDirectionsUrl("", undefined, undefined)).toBe("");
    });

    it("should return empty string when only lat provided without lng", () => {
      expect(getDirectionsUrl("", 32.7767, undefined)).toBe("");
    });

    it("should return empty string when only lng provided without lat", () => {
      expect(getDirectionsUrl("", undefined, -96.797)).toBe("");
    });
  });
});
