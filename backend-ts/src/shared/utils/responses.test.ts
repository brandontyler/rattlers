/**
 * Tests for response utilities.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  successResponse,
  errorResponse,
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  badRequestError,
  internalError,
} from "./responses";

describe("Response Utilities", () => {
  beforeEach(() => {
    vi.stubEnv("ALLOWED_ORIGINS", "http://localhost:3000,https://example.com");
  });

  describe("successResponse", () => {
    it("should return a 200 response with data", () => {
      const result = successResponse({ data: { id: "123", name: "Test" } });

      expect(result.statusCode).toBe(200);
      expect(result.headers?.["Content-Type"]).toBe("application/json");

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: "123", name: "Test" });
    });

    it("should support custom status code", () => {
      const result = successResponse({ data: {}, statusCode: 201 });
      expect(result.statusCode).toBe(201);
    });

    it("should include message when provided", () => {
      const result = successResponse({ message: "Created successfully" });

      const body = JSON.parse(result.body);
      expect(body.message).toBe("Created successfully");
    });

    it("should include pagination when provided", () => {
      const pagination = { page: 1, pageSize: 10, total: 100, totalPages: 10 };
      const result = successResponse({ data: [], pagination });

      const body = JSON.parse(result.body);
      expect(body.pagination).toEqual(pagination);
    });
  });

  describe("errorResponse", () => {
    it("should return an error response with code and message", () => {
      const result = errorResponse({
        code: "TEST_ERROR",
        message: "Something went wrong",
      });

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("TEST_ERROR");
      expect(body.error.message).toBe("Something went wrong");
    });

    it("should include details when provided", () => {
      const result = errorResponse({
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: { field: "Field is required" },
      });

      const body = JSON.parse(result.body);
      expect(body.error.details).toEqual({ field: "Field is required" });
    });
  });

  describe("validationError", () => {
    it("should return a 400 validation error", () => {
      const result = validationError({ email: "Invalid email format" });

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.details?.email).toBe("Invalid email format");
    });
  });

  describe("unauthorizedError", () => {
    it("should return a 401 error", () => {
      const result = unauthorizedError();

      expect(result.statusCode).toBe(401);

      const body = JSON.parse(result.body);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("forbiddenError", () => {
    it("should return a 403 error", () => {
      const result = forbiddenError("Admin access required");

      expect(result.statusCode).toBe(403);

      const body = JSON.parse(result.body);
      expect(body.error.code).toBe("FORBIDDEN");
      expect(body.error.message).toBe("Admin access required");
    });
  });

  describe("notFoundError", () => {
    it("should return a 404 error", () => {
      const result = notFoundError("Location not found");

      expect(result.statusCode).toBe(404);

      const body = JSON.parse(result.body);
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("badRequestError", () => {
    it("should return a 400 error", () => {
      const result = badRequestError("Invalid input");

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.error.code).toBe("BAD_REQUEST");
    });
  });

  describe("internalError", () => {
    it("should return a 500 error", () => {
      const result = internalError();

      expect(result.statusCode).toBe(500);

      const body = JSON.parse(result.body);
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });
  });
});
