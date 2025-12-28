/**
 * Tests for Badge component.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "./Badge";

describe("Badge", () => {
  describe("rendering", () => {
    it("should render children", () => {
      render(<Badge>Test Badge</Badge>);
      expect(screen.getByText("Test Badge")).toBeInTheDocument();
    });

    it("should render as a span element", () => {
      render(<Badge>Test</Badge>);
      const badge = screen.getByText("Test");
      expect(badge.tagName).toBe("SPAN");
    });

    it("should have base badge class", () => {
      render(<Badge>Test</Badge>);
      const badge = screen.getByText("Test");
      expect(badge.className).toContain("badge");
    });
  });

  describe("variants", () => {
    it("should apply forest variant by default", () => {
      render(<Badge>Forest</Badge>);
      const badge = screen.getByText("Forest");
      expect(badge.className).toContain("badge-forest");
    });

    it("should apply gold variant", () => {
      render(<Badge variant="gold">Gold</Badge>);
      const badge = screen.getByText("Gold");
      expect(badge.className).toContain("badge-gold");
    });

    it("should apply burgundy variant", () => {
      render(<Badge variant="burgundy">Burgundy</Badge>);
      const badge = screen.getByText("Burgundy");
      expect(badge.className).toContain("badge-burgundy");
    });
  });

  describe("custom className", () => {
    it("should apply custom className", () => {
      render(<Badge className="custom-badge-class">Custom</Badge>);
      const badge = screen.getByText("Custom");
      expect(badge.className).toContain("custom-badge-class");
    });

    it("should combine variant and custom className", () => {
      render(
        <Badge variant="gold" className="extra-class">
          Combined
        </Badge>
      );
      const badge = screen.getByText("Combined");
      expect(badge.className).toContain("badge-gold");
      expect(badge.className).toContain("extra-class");
    });
  });

  describe("children types", () => {
    it("should render string children", () => {
      render(<Badge>String Content</Badge>);
      expect(screen.getByText("String Content")).toBeInTheDocument();
    });

    it("should render number children", () => {
      render(<Badge>{42}</Badge>);
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("should render element children", () => {
      render(
        <Badge>
          <span data-testid="inner-span">Inner</span>
        </Badge>
      );
      expect(screen.getByTestId("inner-span")).toBeInTheDocument();
    });
  });
});
