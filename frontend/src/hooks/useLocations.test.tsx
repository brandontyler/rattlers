/**
 * Tests for useLocations hooks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useLocations, useLocation } from "./useLocations";
import { apiService } from "@/services/api";
import type { Location } from "@/types";

// Mock the API service
vi.mock("@/services/api", () => ({
  apiService: {
    getLocations: vi.fn(),
    getLocationById: vi.fn(),
  },
}));

// Create a mock location
const mockLocation: Location = {
  id: "loc-123",
  lat: 32.7767,
  lng: -96.797,
  address: "123 Main St, Dallas, TX",
  status: "approved",
  submittedBy: "user-1",
  submittedAt: "2024-01-01T00:00:00Z",
  description: "Beautiful display",
  photos: ["https://example.com/photo1.jpg"],
  likeCount: 10,
};

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useLocations hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useLocations", () => {
    it("should fetch locations successfully", async () => {
      const mockLocations = [mockLocation];
      vi.mocked(apiService.getLocations).mockResolvedValue({
        success: true,
        data: mockLocations,
      });

      const { result } = renderHook(() => useLocations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockLocations);
      expect(apiService.getLocations).toHaveBeenCalledWith({ pageSize: 500 });
    });

    it("should return empty array when response is unsuccessful", async () => {
      vi.mocked(apiService.getLocations).mockResolvedValue({
        success: false,
        data: undefined,
      } as any);

      const { result } = renderHook(() => useLocations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it("should handle loading state", () => {
      vi.mocked(apiService.getLocations).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useLocations(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("should handle error state", async () => {
      vi.mocked(apiService.getLocations).mockRejectedValue(
        new Error("Network error")
      );

      const { result } = renderHook(() => useLocations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("useLocation", () => {
    it("should fetch single location successfully", async () => {
      vi.mocked(apiService.getLocationById).mockResolvedValue({
        success: true,
        data: mockLocation,
      });

      const { result } = renderHook(() => useLocation("loc-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockLocation);
      expect(apiService.getLocationById).toHaveBeenCalledWith("loc-123");
    });

    it("should return null when response is unsuccessful", async () => {
      vi.mocked(apiService.getLocationById).mockResolvedValue({
        success: false,
        data: undefined,
      } as any);

      const { result } = renderHook(() => useLocation("loc-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it("should not fetch when id is empty", () => {
      const { result } = renderHook(() => useLocation(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(apiService.getLocationById).not.toHaveBeenCalled();
    });

    it("should handle error state", async () => {
      vi.mocked(apiService.getLocationById).mockRejectedValue(
        new Error("Not found")
      );

      const { result } = renderHook(() => useLocation("loc-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });
});
