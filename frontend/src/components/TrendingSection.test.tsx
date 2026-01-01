/**
 * Tests for TrendingSection component.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import TrendingSection from "./TrendingSection";
import type { TrendingLocation } from "@/types";

// Mock the hooks module
vi.mock("@/hooks", () => ({
  useTrendingLocations: vi.fn(),
}));

import { useTrendingLocations } from "@/hooks";

// Sample trending locations for testing
const mockTrendingLocations: TrendingLocation[] = [
  {
    id: "loc-1",
    address: "123 Main St, Dallas, TX",
    lat: 32.7767,
    lng: -96.797,
    status: "active",
    description: "Beautiful lights",
    photos: ["photo1.jpg"],
    likeCount: 10,
    reportCount: 0,
    viewCount: 100,
    saveCount: 5,
    createdAt: "2024-12-01T00:00:00.000Z",
    trendingScore: 5.5,
    recentCheckInCount: 3,
    latestCheckInStatus: "amazing",
    latestCheckInAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: "loc-2",
    address: "456 Oak Ave, Plano, TX",
    lat: 33.0198,
    lng: -96.6989,
    status: "active",
    description: "Spectacular display",
    photos: [],
    likeCount: 25,
    reportCount: 0,
    viewCount: 200,
    saveCount: 10,
    createdAt: "2024-12-01T00:00:00.000Z",
    trendingScore: 4.2,
    recentCheckInCount: 2,
    latestCheckInStatus: "on",
    latestCheckInAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
  {
    id: "loc-3",
    address: "789 Elm St, Frisco, TX",
    lat: 33.1507,
    lng: -96.8236,
    status: "active",
    description: "Nice display",
    photos: ["photo3.jpg"],
    likeCount: 5,
    reportCount: 0,
    viewCount: 50,
    saveCount: 2,
    createdAt: "2024-12-01T00:00:00.000Z",
    trendingScore: 2.1,
    recentCheckInCount: 1,
    latestCheckInStatus: "off",
    latestCheckInAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  },
];

// Wrapper component with router
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe("TrendingSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("should show loading skeleton when loading", () => {
      vi.mocked(useTrendingLocations).mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
      } as ReturnType<typeof useTrendingLocations>);

      renderWithRouter(<TrendingSection />);

      // Should show section header
      expect(screen.getByText("Trending This Week")).toBeInTheDocument();

      // Should show loading skeleton (cards with animation)
      const skeletonCards = document.querySelectorAll(".animate-pulse");
      expect(skeletonCards.length).toBe(4);
    });
  });

  describe("error state", () => {
    it("should return null when there is an error", () => {
      vi.mocked(useTrendingLocations).mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
      } as ReturnType<typeof useTrendingLocations>);

      const { container } = renderWithRouter(<TrendingSection />);

      // Should not render anything
      expect(container.innerHTML).toBe("");
    });
  });

  describe("empty state", () => {
    it("should show empty state when no trending locations", () => {
      vi.mocked(useTrendingLocations).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useTrendingLocations>);

      renderWithRouter(<TrendingSection />);

      // Should show empty state message
      expect(screen.getByText("No trending spots yet")).toBeInTheDocument();
      expect(
        screen.getByText(/Be the first to check in at a location/)
      ).toBeInTheDocument();
      expect(screen.getByText("Explore the map →")).toBeInTheDocument();
    });

    it("should not show View Leaderboard link when empty", () => {
      vi.mocked(useTrendingLocations).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useTrendingLocations>);

      renderWithRouter(<TrendingSection />);

      expect(screen.queryByText("View Leaderboard")).not.toBeInTheDocument();
    });
  });

  describe("successful data", () => {
    beforeEach(() => {
      vi.mocked(useTrendingLocations).mockReturnValue({
        data: mockTrendingLocations,
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useTrendingLocations>);
    });

    it("should render trending locations", () => {
      renderWithRouter(<TrendingSection />);

      // Should show section header
      expect(screen.getByText("Trending This Week")).toBeInTheDocument();
      expect(
        screen.getByText("The most active displays based on community check-ins")
      ).toBeInTheDocument();

      // Should show all location addresses
      expect(screen.getByText("123 Main St, Dallas, TX")).toBeInTheDocument();
      expect(screen.getByText("456 Oak Ave, Plano, TX")).toBeInTheDocument();
      expect(screen.getByText("789 Elm St, Frisco, TX")).toBeInTheDocument();
    });

    it("should show rank badges with correct numbers", () => {
      renderWithRouter(<TrendingSection />);

      // Check for rank numbers
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should show HOT badges on all cards", () => {
      renderWithRouter(<TrendingSection />);

      const hotBadges = screen.getAllByText("HOT");
      expect(hotBadges.length).toBe(3);
    });

    it("should show check-in counts", () => {
      renderWithRouter(<TrendingSection />);

      expect(screen.getByText("3 check-ins this week")).toBeInTheDocument();
      expect(screen.getByText("2 check-ins this week")).toBeInTheDocument();
      expect(screen.getByText("1 check-in this week")).toBeInTheDocument();
    });

    it("should link to location detail pages", () => {
      renderWithRouter(<TrendingSection />);

      const links = screen.getAllByRole("link");
      const locationLinks = links.filter((link) =>
        link.getAttribute("href")?.startsWith("/location/")
      );

      expect(locationLinks.length).toBe(3);
      expect(locationLinks[0]).toHaveAttribute("href", "/location/loc-1");
      expect(locationLinks[1]).toHaveAttribute("href", "/location/loc-2");
      expect(locationLinks[2]).toHaveAttribute("href", "/location/loc-3");
    });

    it("should show View Leaderboard link when there are locations", () => {
      renderWithRouter(<TrendingSection />);

      const leaderboardLinks = screen.getAllByText("View Leaderboard");
      expect(leaderboardLinks.length).toBeGreaterThan(0);
      expect(leaderboardLinks[0].closest("a")).toHaveAttribute(
        "href",
        "/leaderboard"
      );
    });

    it("should show View links on each card", () => {
      renderWithRouter(<TrendingSection />);

      const viewLinks = screen.getAllByText("View →");
      expect(viewLinks.length).toBe(3);
    });

    it("should show check-in status labels", () => {
      renderWithRouter(<TrendingSection />);

      // The component should show the status labels from CHECK_IN_STATUS_LABELS
      // amazing -> "Amazing Tonight", on -> "Lights ON", off -> "Lights OFF"
      expect(screen.getByText("Amazing Tonight")).toBeInTheDocument();
      expect(screen.getByText("Lights ON")).toBeInTheDocument();
      expect(screen.getByText("Lights OFF")).toBeInTheDocument();
    });
  });

  describe("relative time formatting", () => {
    it("should show relative time for recent check-ins", () => {
      // Create location with check-in 2 hours ago
      const recentLocation: TrendingLocation = {
        ...mockTrendingLocations[0],
        latestCheckInAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      };

      vi.mocked(useTrendingLocations).mockReturnValue({
        data: [recentLocation],
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useTrendingLocations>);

      renderWithRouter(<TrendingSection />);

      expect(screen.getByText("2h ago")).toBeInTheDocument();
    });

    it("should show 'yesterday' for check-ins 1 day ago", () => {
      const yesterdayLocation: TrendingLocation = {
        ...mockTrendingLocations[0],
        latestCheckInAt: new Date(
          Date.now() - 1 * 24 * 60 * 60 * 1000
        ).toISOString(),
      };

      vi.mocked(useTrendingLocations).mockReturnValue({
        data: [yesterdayLocation],
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useTrendingLocations>);

      renderWithRouter(<TrendingSection />);

      expect(screen.getByText("yesterday")).toBeInTheDocument();
    });

    it("should show days ago for older check-ins", () => {
      const olderLocation: TrendingLocation = {
        ...mockTrendingLocations[0],
        latestCheckInAt: new Date(
          Date.now() - 3 * 24 * 60 * 60 * 1000
        ).toISOString(),
      };

      vi.mocked(useTrendingLocations).mockReturnValue({
        data: [olderLocation],
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useTrendingLocations>);

      renderWithRouter(<TrendingSection />);

      expect(screen.getByText("3d ago")).toBeInTheDocument();
    });

    it("should show 'just now' for very recent check-ins", () => {
      const justNowLocation: TrendingLocation = {
        ...mockTrendingLocations[0],
        latestCheckInAt: new Date(Date.now() - 30 * 1000).toISOString(), // 30 seconds ago
      };

      vi.mocked(useTrendingLocations).mockReturnValue({
        data: [justNowLocation],
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useTrendingLocations>);

      renderWithRouter(<TrendingSection />);

      expect(screen.getByText("just now")).toBeInTheDocument();
    });
  });

  describe("hook parameters", () => {
    it("should call useTrendingLocations with correct parameters", () => {
      vi.mocked(useTrendingLocations).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useTrendingLocations>);

      renderWithRouter(<TrendingSection />);

      // Should request 8 locations for the past 7 days
      expect(useTrendingLocations).toHaveBeenCalledWith(8, 7);
    });
  });
});
