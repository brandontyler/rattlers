/**
 * Tests for AchievementContext.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { AchievementProvider, useAchievements } from "./AchievementContext";

// Mock AuthContext to provide a test user
vi.mock("./AuthContext", async () => {
  const actual = await vi.importActual("./AuthContext");
  return {
    ...actual,
    useAuth: () => ({
      isAuthenticated: true,
      user: { id: "test-user-123", email: "test@example.com" },
      isLoading: false,
    }),
  };
});

// Wrapper component for testing
const wrapper = ({ children }: { children: ReactNode }) => (
  <AchievementProvider>{children}</AchievementProvider>
);

describe("AchievementContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("useAchievements hook", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAchievements());
      }).toThrow("useAchievements must be used within an AchievementProvider");

      consoleSpy.mockRestore();
    });

    it("should provide initial empty state", () => {
      const { result } = renderHook(() => useAchievements(), { wrapper });

      expect(result.current.unlockedAchievements).toEqual([]);
      expect(result.current.achievementQueue).toEqual([]);
      expect(result.current.totalXP).toBe(0);
    });
  });

  describe("unlockAchievement", () => {
    it("should unlock an achievement", async () => {
      const { result } = renderHook(() => useAchievements(), { wrapper });

      act(() => {
        result.current.unlockAchievement("let-there-be-light");
      });

      await waitFor(() => {
        expect(result.current.unlockedAchievements).toHaveLength(1);
        expect(result.current.unlockedAchievements[0].id).toBe("let-there-be-light");
      });
    });

    it("should add achievement to queue for popup", async () => {
      const { result } = renderHook(() => useAchievements(), { wrapper });

      act(() => {
        result.current.unlockAchievement("the-first-noel");
      });

      await waitFor(() => {
        expect(result.current.achievementQueue).toHaveLength(1);
        expect(result.current.achievementQueue[0].id).toBe("the-first-noel");
      });
    });

    it("should not unlock already unlocked achievement", async () => {
      const { result } = renderHook(() => useAchievements(), { wrapper });

      act(() => {
        result.current.unlockAchievement("heart-of-gold");
      });

      await waitFor(() => {
        expect(result.current.unlockedAchievements).toHaveLength(1);
      });

      act(() => {
        result.current.unlockAchievement("heart-of-gold");
      });

      // Should still only have 1
      expect(result.current.unlockedAchievements).toHaveLength(1);
    });

    it("should calculate total XP correctly", async () => {
      const { result } = renderHook(() => useAchievements(), { wrapper });

      act(() => {
        result.current.unlockAchievement("let-there-be-light"); // 50 XP
        result.current.unlockAchievement("the-first-noel"); // 100 XP
      });

      await waitFor(() => {
        expect(result.current.totalXP).toBe(150);
      });
    });
  });

  describe("isUnlocked", () => {
    it("should return false for not unlocked achievement", () => {
      const { result } = renderHook(() => useAchievements(), { wrapper });

      expect(result.current.isUnlocked("let-there-be-light")).toBe(false);
    });

    it("should return true for unlocked achievement", async () => {
      const { result } = renderHook(() => useAchievements(), { wrapper });

      act(() => {
        result.current.unlockAchievement("heart-of-gold");
      });

      await waitFor(() => {
        expect(result.current.isUnlocked("heart-of-gold")).toBe(true);
      });
    });
  });

  describe("popNextAchievement", () => {
    it("should return undefined for empty queue", () => {
      const { result } = renderHook(() => useAchievements(), { wrapper });

      const popped = result.current.popNextAchievement();
      expect(popped).toBeUndefined();
    });

    it("should pop achievement from queue", async () => {
      const { result } = renderHook(() => useAchievements(), { wrapper });

      act(() => {
        result.current.unlockAchievement("let-there-be-light");
      });

      await waitFor(() => {
        expect(result.current.achievementQueue).toHaveLength(1);
      });

      let popped: any;
      act(() => {
        popped = result.current.popNextAchievement();
      });

      expect(popped?.id).toBe("let-there-be-light");

      await waitFor(() => {
        expect(result.current.achievementQueue).toHaveLength(0);
      });
    });
  });

  describe("checkAchievements", () => {
    it("should unlock first submission achievement", async () => {
      const { result } = renderHook(() => useAchievements(), { wrapper });

      act(() => {
        result.current.checkAchievements({
          hasFirstSubmission: true,
        });
      });

      await waitFor(() => {
        expect(result.current.isUnlocked("let-there-be-light")).toBe(true);
      });
    });

    it("should unlock first approval achievement", async () => {
      const { result } = renderHook(() => useAchievements(), { wrapper });

      act(() => {
        result.current.checkAchievements({
          hasFirstApproval: true,
        });
      });

      await waitFor(() => {
        expect(result.current.isUnlocked("the-first-noel")).toBe(true);
      });
    });

    it("should unlock first like achievement", async () => {
      const { result } = renderHook(() => useAchievements(), { wrapper });

      act(() => {
        result.current.checkAchievements({
          hasFirstLike: true,
        });
      });

      await waitFor(() => {
        expect(result.current.isUnlocked("heart-of-gold")).toBe(true);
      });
    });

    it("should unlock first route achievement", async () => {
      const { result } = renderHook(() => useAchievements(), { wrapper });

      act(() => {
        result.current.checkAchievements({
          hasFirstRoute: true,
        });
      });

      await waitFor(() => {
        expect(result.current.isUnlocked("trail-blazer")).toBe(true);
      });
    });

    it("should unlock contributor achievements based on approved count", async () => {
      const { result } = renderHook(() => useAchievements(), { wrapper });

      act(() => {
        result.current.checkAchievements({
          approvedSubmissions: 5,
        });
      });

      await waitFor(() => {
        expect(result.current.isUnlocked("scout")).toBe(true);
      });
    });

    it("should unlock multiple achievements at once", async () => {
      const { result } = renderHook(() => useAchievements(), { wrapper });

      act(() => {
        result.current.checkAchievements({
          hasFirstSubmission: true,
          hasFirstApproval: true,
          hasFirstLike: true,
          approvedSubmissions: 15,
        });
      });

      await waitFor(() => {
        expect(result.current.isUnlocked("let-there-be-light")).toBe(true);
        expect(result.current.isUnlocked("the-first-noel")).toBe(true);
        expect(result.current.isUnlocked("heart-of-gold")).toBe(true);
        expect(result.current.isUnlocked("scout")).toBe(true);
        expect(result.current.isUnlocked("enthusiast")).toBe(true);
      });
    });

    it("should unlock popularity achievements based on max likes", async () => {
      const { result } = renderHook(() => useAchievements(), { wrapper });

      act(() => {
        result.current.checkAchievements({
          maxLikesOnSingleLocation: 25,
        });
      });

      await waitFor(() => {
        expect(result.current.isUnlocked("crowd-pleaser")).toBe(true);
        expect(result.current.isUnlocked("local-celebrity")).toBe(true);
        expect(result.current.isUnlocked("holiday-hero")).toBe(false);
      });
    });
  });

  describe("localStorage persistence", () => {
    it("should save achievements to localStorage", async () => {
      const { result } = renderHook(() => useAchievements(), { wrapper });

      act(() => {
        result.current.unlockAchievement("let-there-be-light");
      });

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalled();
      });
    });
  });
});
