/**
 * Vitest global test setup.
 *
 * Sets up mocks and environment variables for all tests.
 */

import { beforeAll, afterAll, afterEach, vi } from "vitest";

// Mock environment variables
beforeAll(() => {
  process.env.LOCATIONS_TABLE_NAME = "test-locations-table";
  process.env.FEEDBACK_TABLE_NAME = "test-feedback-table";
  process.env.SUGGESTIONS_TABLE_NAME = "test-suggestions-table";
  process.env.ROUTES_TABLE_NAME = "test-routes-table";
  process.env.ROUTE_FEEDBACK_TABLE_NAME = "test-route-feedback-table";
  process.env.USERS_TABLE_NAME = "test-users-table";
  process.env.PHOTOS_BUCKET_NAME = "test-photos-bucket";
  process.env.ALLOWED_ORIGINS = "http://localhost:3000,https://example.com";
  process.env.AWS_REGION = "us-east-1";
});

// Clear all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Cleanup after all tests
afterAll(() => {
  vi.restoreAllMocks();
});
