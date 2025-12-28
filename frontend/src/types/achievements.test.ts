/**
 * Tests for achievement types and utility functions.
 */

import { describe, it, expect } from "vitest";
import {
  ACHIEVEMENTS,
  getAchievementsByCategory,
  getAchievementsByRarity,
  calculateTotalXP,
  getRarityColors,
  CATEGORY_INFO,
} from "./achievements";

describe("Achievement Types", () => {
  describe("ACHIEVEMENTS constant", () => {
    it("should have all achievements defined", () => {
      // At least 20 achievements
      expect(Object.keys(ACHIEVEMENTS).length).toBeGreaterThanOrEqual(20);
    });

    it("should have all required properties for each achievement", () => {
      Object.values(ACHIEVEMENTS).forEach((achievement) => {
        expect(achievement).toHaveProperty("id");
        expect(achievement).toHaveProperty("name");
        expect(achievement).toHaveProperty("description");
        expect(achievement).toHaveProperty("hint");
        expect(achievement).toHaveProperty("category");
        expect(achievement).toHaveProperty("rarity");
        expect(achievement).toHaveProperty("xp");
        expect(achievement).toHaveProperty("icon");
      });
    });

    it("should have matching id key and id property", () => {
      Object.entries(ACHIEVEMENTS).forEach(([key, achievement]) => {
        expect(key).toBe(achievement.id);
      });
    });

    it("should have positive XP values", () => {
      Object.values(ACHIEVEMENTS).forEach((achievement) => {
        expect(achievement.xp).toBeGreaterThan(0);
      });
    });
  });

  describe("getAchievementsByCategory", () => {
    it("should return first-steps achievements", () => {
      const achievements = getAchievementsByCategory("first-steps");
      expect(achievements.length).toBeGreaterThan(0);
      achievements.forEach((a) => {
        expect(a.category).toBe("first-steps");
      });
    });

    it("should return quality achievements", () => {
      const achievements = getAchievementsByCategory("quality");
      expect(achievements.length).toBeGreaterThan(0);
      achievements.forEach((a) => {
        expect(a.category).toBe("quality");
      });
    });

    it("should return popularity achievements", () => {
      const achievements = getAchievementsByCategory("popularity");
      expect(achievements.length).toBeGreaterThan(0);
      achievements.forEach((a) => {
        expect(a.category).toBe("popularity");
      });
    });

    it("should return contributor achievements", () => {
      const achievements = getAchievementsByCategory("contributor");
      expect(achievements.length).toBeGreaterThan(0);
      achievements.forEach((a) => {
        expect(a.category).toBe("contributor");
      });
    });

    it("should return engagement achievements", () => {
      const achievements = getAchievementsByCategory("engagement");
      expect(achievements.length).toBeGreaterThan(0);
      achievements.forEach((a) => {
        expect(a.category).toBe("engagement");
      });
    });
  });

  describe("getAchievementsByRarity", () => {
    it("should return common achievements", () => {
      const achievements = getAchievementsByRarity("common");
      expect(achievements.length).toBeGreaterThan(0);
      achievements.forEach((a) => {
        expect(a.rarity).toBe("common");
      });
    });

    it("should return uncommon achievements", () => {
      const achievements = getAchievementsByRarity("uncommon");
      expect(achievements.length).toBeGreaterThan(0);
      achievements.forEach((a) => {
        expect(a.rarity).toBe("uncommon");
      });
    });

    it("should return rare achievements", () => {
      const achievements = getAchievementsByRarity("rare");
      expect(achievements.length).toBeGreaterThan(0);
      achievements.forEach((a) => {
        expect(a.rarity).toBe("rare");
      });
    });

    it("should return epic achievements", () => {
      const achievements = getAchievementsByRarity("epic");
      expect(achievements.length).toBeGreaterThan(0);
      achievements.forEach((a) => {
        expect(a.rarity).toBe("epic");
      });
    });

    it("should return legendary achievements", () => {
      const achievements = getAchievementsByRarity("legendary");
      expect(achievements.length).toBeGreaterThan(0);
      achievements.forEach((a) => {
        expect(a.rarity).toBe("legendary");
      });
    });
  });

  describe("calculateTotalXP", () => {
    it("should return 0 for empty array", () => {
      expect(calculateTotalXP([])).toBe(0);
    });

    it("should calculate correct total for single achievement", () => {
      const xp = calculateTotalXP(["let-there-be-light"]);
      expect(xp).toBe(50);
    });

    it("should calculate correct total for multiple achievements", () => {
      const xp = calculateTotalXP(["let-there-be-light", "the-first-noel"]);
      expect(xp).toBe(150); // 50 + 100
    });

    it("should handle unknown achievement IDs", () => {
      const xp = calculateTotalXP(["unknown-id" as any]);
      expect(xp).toBe(0);
    });
  });

  describe("getRarityColors", () => {
    it("should return correct colors for common rarity", () => {
      const colors = getRarityColors("common");
      expect(colors.bg).toContain("gray");
      expect(colors.text).toContain("gray");
      expect(colors.border).toContain("gray");
    });

    it("should return correct colors for uncommon rarity", () => {
      const colors = getRarityColors("uncommon");
      expect(colors.bg).toContain("forest");
      expect(colors.text).toContain("cream");
      expect(colors.border).toContain("forest");
      expect(colors.glow).not.toBe("");
    });

    it("should return correct colors for rare rarity", () => {
      const colors = getRarityColors("rare");
      expect(colors.bg).toContain("blue");
      expect(colors.text).toContain("blue");
      expect(colors.border).toContain("blue");
      expect(colors.glow).not.toBe("");
    });

    it("should return correct colors for epic rarity", () => {
      const colors = getRarityColors("epic");
      expect(colors.bg).toContain("purple");
      expect(colors.text).toContain("purple");
      expect(colors.border).toContain("purple");
      expect(colors.glow).not.toBe("");
    });

    it("should return correct colors for legendary rarity", () => {
      const colors = getRarityColors("legendary");
      expect(colors.bg).toContain("gold");
      expect(colors.text).toContain("gold");
      expect(colors.border).toContain("gold");
      expect(colors.glow).toContain("glow");
    });

    it("should return object with all required properties", () => {
      const rarities = ["common", "uncommon", "rare", "epic", "legendary"] as const;
      rarities.forEach((rarity) => {
        const colors = getRarityColors(rarity);
        expect(colors).toHaveProperty("bg");
        expect(colors).toHaveProperty("text");
        expect(colors).toHaveProperty("border");
        expect(colors).toHaveProperty("glow");
      });
    });
  });

  describe("CATEGORY_INFO", () => {
    it("should have info for all categories", () => {
      const categories = ["first-steps", "quality", "popularity", "contributor", "engagement"];
      categories.forEach((category) => {
        expect(CATEGORY_INFO[category as keyof typeof CATEGORY_INFO]).toBeDefined();
      });
    });

    it("should have required properties for each category", () => {
      Object.values(CATEGORY_INFO).forEach((info) => {
        expect(info).toHaveProperty("name");
        expect(info).toHaveProperty("icon");
        expect(info).toHaveProperty("description");
        expect(info.name).not.toBe("");
        expect(info.icon).not.toBe("");
        expect(info.description).not.toBe("");
      });
    });
  });
});
