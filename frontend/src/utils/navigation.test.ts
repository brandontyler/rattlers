/**
 * Tests for navigation utility functions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Location } from "@/types";
import {
  NAVIGATION_APPS,
  getGoogleMapsUrl,
  getAppleMapsUrl,
  getWazeUrl,
  getNavigationUrl,
  getStopByStopUrls,
  getPreferredNavigationApp,
  setPreferredNavigationApp,
  openNavigation,
} from "./navigation";

// Mock location data
const createLocation = (id: string, lat: number, lng: number): Location => ({
  id,
  lat,
  lng,
  address: `${id} Main St`,
  status: "approved",
  submittedBy: "user1",
  submittedAt: "2024-01-01",
});

const mockStops: Location[] = [
  createLocation("1", 32.7767, -96.797),
  createLocation("2", 32.78, -96.8),
  createLocation("3", 32.785, -96.805),
];

describe("Navigation Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("NAVIGATION_APPS constants", () => {
    it("should have correct properties for Google Maps", () => {
      expect(NAVIGATION_APPS.google).toEqual({
        id: "google",
        name: "Google Maps",
        icon: "🗺️",
        supportsMultiStop: true,
        maxWaypoints: 25,
      });
    });

    it("should have correct properties for Apple Maps", () => {
      expect(NAVIGATION_APPS.apple).toEqual({
        id: "apple",
        name: "Apple Maps",
        icon: "🍎",
        supportsMultiStop: false,
        maxWaypoints: null,
      });
    });

    it("should have correct properties for Waze", () => {
      expect(NAVIGATION_APPS.waze).toEqual({
        id: "waze",
        name: "Waze",
        icon: "👻",
        supportsMultiStop: false,
        maxWaypoints: null,
      });
    });
  });

  describe("getGoogleMapsUrl", () => {
    it("should return empty string for empty stops array", () => {
      expect(getGoogleMapsUrl([])).toBe("");
    });

    it("should generate simple destination URL for single stop", () => {
      const stops = [mockStops[0]];
      const result = getGoogleMapsUrl(stops);
      expect(result).toBe(
        "https://www.google.com/maps/dir/?api=1&destination=32.7767,-96.797"
      );
    });

    it("should generate origin and destination URL for two stops", () => {
      const stops = [mockStops[0], mockStops[1]];
      const result = getGoogleMapsUrl(stops);
      expect(result).toContain("origin=32.7767,-96.797");
      expect(result).toContain("destination=32.78,-96.8");
      expect(result).toContain("travelmode=driving");
    });

    it("should include waypoints for three or more stops", () => {
      const result = getGoogleMapsUrl(mockStops);
      expect(result).toContain("origin=32.7767,-96.797");
      expect(result).toContain("destination=32.785,-96.805");
      expect(result).toContain("waypoints=32.78,-96.8");
      expect(result).toContain("travelmode=driving");
    });

    it("should separate multiple waypoints with pipe character", () => {
      const fourStops = [
        ...mockStops,
        createLocation("4", 32.79, -96.81),
      ];
      const result = getGoogleMapsUrl(fourStops);
      expect(result).toContain("waypoints=32.78,-96.8|32.785,-96.805");
    });
  });

  describe("getAppleMapsUrl", () => {
    it("should generate basic destination URL", () => {
      const result = getAppleMapsUrl(mockStops[0]);
      expect(result).toBe(
        "https://maps.apple.com/?daddr=32.7767,-96.797&dirflg=d"
      );
    });

    it("should include origin when provided", () => {
      const origin = { lat: 32.77, lng: -96.79 };
      const result = getAppleMapsUrl(mockStops[0], origin);
      expect(result).toContain("daddr=32.7767,-96.797");
      expect(result).toContain("saddr=32.77,-96.79");
      expect(result).toContain("dirflg=d");
    });
  });

  describe("getWazeUrl", () => {
    it("should generate Waze deep link URL", () => {
      const result = getWazeUrl(mockStops[0]);
      expect(result).toBe(
        "https://waze.com/ul?ll=32.7767,-96.797&navigate=yes"
      );
    });
  });

  describe("getNavigationUrl", () => {
    it("should return empty string for empty stops", () => {
      expect(getNavigationUrl("google", [])).toBe("");
      expect(getNavigationUrl("apple", [])).toBe("");
      expect(getNavigationUrl("waze", [])).toBe("");
    });

    it("should return Google Maps URL for google app", () => {
      const result = getNavigationUrl("google", mockStops);
      expect(result).toContain("google.com/maps");
    });

    it("should return Apple Maps URL for apple app", () => {
      const result = getNavigationUrl("apple", mockStops, 0);
      expect(result).toContain("maps.apple.com");
    });

    it("should return Waze URL for waze app", () => {
      const result = getNavigationUrl("waze", mockStops, 0);
      expect(result).toContain("waze.com/ul");
    });

    it("should use stopIndex for Apple Maps", () => {
      const result = getNavigationUrl("apple", mockStops, 1);
      expect(result).toContain("daddr=32.78,-96.8");
      expect(result).toContain("saddr=32.7767,-96.797");
    });

    it("should use stopIndex for Waze", () => {
      const result = getNavigationUrl("waze", mockStops, 1);
      expect(result).toContain("ll=32.78,-96.8");
    });

    it("should fallback to first stop if stopIndex is out of bounds", () => {
      const result = getNavigationUrl("waze", mockStops, 10);
      expect(result).toContain("ll=32.7767,-96.797");
    });

    it("should default to Google Maps for unknown app", () => {
      const result = getNavigationUrl("unknown" as any, mockStops);
      expect(result).toContain("google.com/maps");
    });
  });

  describe("getStopByStopUrls", () => {
    it("should return URLs for each stop", () => {
      const result = getStopByStopUrls("waze", mockStops);
      expect(result).toHaveLength(3);
      expect(result[0].index).toBe(0);
      expect(result[1].index).toBe(1);
      expect(result[2].index).toBe(2);
    });

    it("should include stop location in each result", () => {
      const result = getStopByStopUrls("apple", mockStops);
      expect(result[0].stop).toBe(mockStops[0]);
      expect(result[1].stop).toBe(mockStops[1]);
      expect(result[2].stop).toBe(mockStops[2]);
    });

    it("should include valid URLs in each result", () => {
      const result = getStopByStopUrls("waze", mockStops);
      result.forEach((item) => {
        expect(item.url).toContain("waze.com/ul");
      });
    });
  });

  describe("getPreferredNavigationApp", () => {
    it("should return google as default when nothing saved", () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);
      expect(getPreferredNavigationApp()).toBe("google");
    });

    it("should return saved preference", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("waze");
      expect(getPreferredNavigationApp()).toBe("waze");
    });

    it("should return google for invalid saved value", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("invalid");
      expect(getPreferredNavigationApp()).toBe("google");
    });
  });

  describe("setPreferredNavigationApp", () => {
    it("should save preference to localStorage", () => {
      setPreferredNavigationApp("apple");
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "preferredNavigationApp",
        "apple"
      );
    });
  });

  describe("openNavigation", () => {
    it("should open URL in new tab", () => {
      const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
      openNavigation("google", mockStops);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining("google.com/maps"),
        "_blank"
      );
    });

    it("should not open window for empty stops", () => {
      const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
      openNavigation("google", []);
      expect(windowOpenSpy).not.toHaveBeenCalled();
    });
  });
});
