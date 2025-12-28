/**
 * Tests for RouteContext.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import {
  RouteProvider,
  useRoute,
  dispatchRouteEvent,
  ROUTE_EVENTS,
} from "./RouteContext";
import type { Location } from "@/types";

// Mock the API service
vi.mock("@/services/api", () => ({
  apiService: {
    generateRoutePdf: vi.fn().mockResolvedValue({
      success: true,
      data: { downloadUrl: "https://example.com/route.pdf" },
    }),
  },
}));

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

// Wrapper component for testing
const wrapper = ({ children }: { children: ReactNode }) => (
  <RouteProvider>{children}</RouteProvider>
);

describe("RouteContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useRoute hook", () => {
    it("should throw error when used outside provider", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useRoute());
      }).toThrow("useRoute must be used within a RouteProvider");

      consoleSpy.mockRestore();
    });

    it("should provide initial empty state", () => {
      const { result } = renderHook(() => useRoute(), { wrapper });

      expect(result.current.stops).toEqual([]);
      expect(result.current.stats.totalDistance).toBe(0);
      expect(result.current.stats.totalTime).toBe(0);
      expect(result.current.isGeneratingPdf).toBe(false);
      expect(result.current.isPanelExpanded).toBe(false);
    });
  });

  describe("addStop", () => {
    it("should add a stop to the route", () => {
      const { result } = renderHook(() => useRoute(), { wrapper });
      const location = createLocation("1", 32.7767, -96.797);

      act(() => {
        result.current.addStop(location);
      });

      expect(result.current.stops).toHaveLength(1);
      expect(result.current.stops[0]).toEqual(location);
    });

    it("should not add duplicate stops", () => {
      const { result } = renderHook(() => useRoute(), { wrapper });
      const location = createLocation("1", 32.7767, -96.797);

      act(() => {
        result.current.addStop(location);
        result.current.addStop(location);
      });

      expect(result.current.stops).toHaveLength(1);
    });

    it("should not exceed MAX_STOPS (15)", () => {
      const { result } = renderHook(() => useRoute(), { wrapper });

      act(() => {
        for (let i = 0; i < 20; i++) {
          result.current.addStop(createLocation(`${i}`, 32.77 + i * 0.01, -96.79));
        }
      });

      expect(result.current.stops).toHaveLength(15);
    });
  });

  describe("removeStop", () => {
    it("should remove a stop from the route", () => {
      const { result } = renderHook(() => useRoute(), { wrapper });
      const location1 = createLocation("1", 32.7767, -96.797);
      const location2 = createLocation("2", 32.78, -96.8);

      act(() => {
        result.current.addStop(location1);
        result.current.addStop(location2);
      });

      act(() => {
        result.current.removeStop("1");
      });

      expect(result.current.stops).toHaveLength(1);
      expect(result.current.stops[0].id).toBe("2");
    });

    it("should handle removing non-existent stop", () => {
      const { result } = renderHook(() => useRoute(), { wrapper });

      act(() => {
        result.current.removeStop("non-existent");
      });

      expect(result.current.stops).toHaveLength(0);
    });
  });

  describe("reorderStops", () => {
    it("should reorder stops", () => {
      const { result } = renderHook(() => useRoute(), { wrapper });
      const loc1 = createLocation("1", 32.77, -96.79);
      const loc2 = createLocation("2", 32.78, -96.80);
      const loc3 = createLocation("3", 32.79, -96.81);

      act(() => {
        result.current.addStop(loc1);
        result.current.addStop(loc2);
        result.current.addStop(loc3);
      });

      act(() => {
        result.current.reorderStops(0, 2);
      });

      expect(result.current.stops[0].id).toBe("2");
      expect(result.current.stops[1].id).toBe("3");
      expect(result.current.stops[2].id).toBe("1");
    });
  });

  describe("optimizeRoute", () => {
    it("should optimize the route order", () => {
      const { result } = renderHook(() => useRoute(), { wrapper });

      // Add stops in a suboptimal order
      act(() => {
        result.current.addStop(createLocation("1", 32.77, -96.79));
        result.current.addStop(createLocation("2", 32.80, -96.82));
        result.current.addStop(createLocation("3", 32.78, -96.80));
      });

      const originalOrder = result.current.stops.map((s) => s.id);

      act(() => {
        result.current.optimizeRoute();
      });

      // First stop should remain the same
      expect(result.current.stops[0].id).toBe("1");
      // All stops should still be present
      expect(result.current.stops.map((s) => s.id).sort()).toEqual(originalOrder.sort());
    });
  });

  describe("clearRoute", () => {
    it("should clear all stops", () => {
      const { result } = renderHook(() => useRoute(), { wrapper });

      act(() => {
        result.current.addStop(createLocation("1", 32.77, -96.79));
        result.current.addStop(createLocation("2", 32.78, -96.80));
      });

      act(() => {
        result.current.clearRoute();
      });

      expect(result.current.stops).toHaveLength(0);
    });

    it("should collapse panel when clearing", () => {
      const { result } = renderHook(() => useRoute(), { wrapper });

      act(() => {
        result.current.setIsPanelExpanded(true);
        result.current.addStop(createLocation("1", 32.77, -96.79));
      });

      act(() => {
        result.current.clearRoute();
      });

      expect(result.current.isPanelExpanded).toBe(false);
    });
  });

  describe("isInRoute", () => {
    it("should return true for stops in route", () => {
      const { result } = renderHook(() => useRoute(), { wrapper });
      const location = createLocation("1", 32.7767, -96.797);

      act(() => {
        result.current.addStop(location);
      });

      expect(result.current.isInRoute("1")).toBe(true);
    });

    it("should return false for stops not in route", () => {
      const { result } = renderHook(() => useRoute(), { wrapper });

      expect(result.current.isInRoute("non-existent")).toBe(false);
    });
  });

  describe("stats calculation", () => {
    it("should calculate stats for route", () => {
      const { result } = renderHook(() => useRoute(), { wrapper });

      act(() => {
        result.current.addStop(createLocation("1", 32.77, -96.79));
        result.current.addStop(createLocation("2", 32.78, -96.80));
        result.current.addStop(createLocation("3", 32.79, -96.81));
      });

      expect(result.current.stats.totalDistance).toBeGreaterThan(0);
      expect(result.current.stats.totalTime).toBeGreaterThan(0);
    });
  });

  describe("generatePdf", () => {
    it("should throw error for empty route", async () => {
      const { result } = renderHook(() => useRoute(), { wrapper });

      await expect(result.current.generatePdf()).rejects.toThrow(
        "No stops in route"
      );
    });

    it("should generate PDF and return download URL", async () => {
      const { result } = renderHook(() => useRoute(), { wrapper });

      act(() => {
        result.current.addStop(createLocation("1", 32.77, -96.79));
      });

      let url: string;
      await act(async () => {
        url = await result.current.generatePdf();
      });

      expect(url!).toBe("https://example.com/route.pdf");
    });
  });

  describe("panel expansion", () => {
    it("should toggle panel expansion", () => {
      const { result } = renderHook(() => useRoute(), { wrapper });

      expect(result.current.isPanelExpanded).toBe(false);

      act(() => {
        result.current.setIsPanelExpanded(true);
      });

      expect(result.current.isPanelExpanded).toBe(true);
    });
  });

  describe("dispatchRouteEvent", () => {
    it("should dispatch custom events", () => {
      const listener = vi.fn();
      window.addEventListener(ROUTE_EVENTS.ADD_STOP, listener);

      const location = createLocation("1", 32.77, -96.79);
      dispatchRouteEvent(ROUTE_EVENTS.ADD_STOP, location);

      expect(listener).toHaveBeenCalled();

      window.removeEventListener(ROUTE_EVENTS.ADD_STOP, listener);
    });
  });

  describe("event listeners", () => {
    it("should add stop when ADD_STOP event is dispatched", async () => {
      const { result } = renderHook(() => useRoute(), { wrapper });
      const location = createLocation("1", 32.77, -96.79);

      act(() => {
        dispatchRouteEvent(ROUTE_EVENTS.ADD_STOP, location);
      });

      await waitFor(() => {
        expect(result.current.stops).toHaveLength(1);
      });
    });

    it("should remove stop when REMOVE_STOP event is dispatched", async () => {
      const { result } = renderHook(() => useRoute(), { wrapper });
      const location = createLocation("1", 32.77, -96.79);

      act(() => {
        result.current.addStop(location);
      });

      act(() => {
        dispatchRouteEvent(ROUTE_EVENTS.REMOVE_STOP, "1");
      });

      await waitFor(() => {
        expect(result.current.stops).toHaveLength(0);
      });
    });
  });
});
