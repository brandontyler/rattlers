/**
 * Tests for ApiService.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";

// Mock axios before importing the service
vi.mock("axios", () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };

  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
  };
});

// Import after mocking
import { apiService } from "./api";

describe("ApiService", () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mocked axios instance
    mockAxiosInstance = (axios.create as any)();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("getLocations", () => {
    it("should fetch locations with default params", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [{ id: "1", address: "123 Main St" }],
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiService.getLocations();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/locations", {
        params: undefined,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should fetch locations with filters", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [],
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const filters = { status: "active" as const, pageSize: 50 };
      await apiService.getLocations(filters);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/locations", {
        params: filters,
      });
    });
  });

  describe("getLocationById", () => {
    it("should fetch a single location", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { id: "123", address: "123 Main St" },
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiService.getLocationById("123");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/locations/123");
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("createLocation", () => {
    it("should create a new location", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { id: "new-123", address: "456 Oak Ave" },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const locationData = { address: "456 Oak Ave", lat: 32.77, lng: -96.79 };
      const result = await apiService.createLocation(locationData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/locations", locationData);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("updateLocation", () => {
    it("should update an existing location", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { id: "123", description: "Updated description" },
        },
      };
      mockAxiosInstance.put.mockResolvedValue(mockResponse);

      const updates = { description: "Updated description" };
      const result = await apiService.updateLocation("123", updates);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith("/locations/123", updates);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("deleteLocation", () => {
    it("should delete a location", async () => {
      const mockResponse = {
        data: { success: true },
      };
      mockAxiosInstance.delete.mockResolvedValue(mockResponse);

      const result = await apiService.deleteLocation("123");

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith("/locations/123");
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("submitFeedback", () => {
    it("should submit feedback for a location", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { liked: true },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const feedback = { type: "like" as const };
      const result = await apiService.submitFeedback("123", feedback);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/locations/123/feedback",
        feedback
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("getFeedbackStatus", () => {
    it("should get feedback status for a location", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { hasLiked: true, hasFavorited: false },
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiService.getFeedbackStatus("123");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/locations/123/feedback/status"
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("submitSuggestion", () => {
    it("should submit a new suggestion", async () => {
      const mockResponse = {
        data: { success: true },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const suggestion = {
        address: "789 Pine St",
        lat: 32.78,
        lng: -96.80,
        description: "New display",
      };
      const result = await apiService.submitSuggestion(suggestion);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/suggestions", suggestion);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("getSuggestions", () => {
    it("should get suggestions with status filter", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [{ id: "sug-1", status: "pending" }],
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiService.getSuggestions("pending");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/suggestions", {
        params: { status: "pending" },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("approveSuggestion", () => {
    it("should approve a suggestion", async () => {
      const mockResponse = {
        data: { success: true },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await apiService.approveSuggestion("sug-123");

      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/suggestions/sug-123/approve");
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("rejectSuggestion", () => {
    it("should reject a suggestion with reason", async () => {
      const mockResponse = {
        data: { success: true },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await apiService.rejectSuggestion("sug-123", "Not valid");

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/suggestions/sug-123/reject",
        { reason: "Not valid" }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("getUserProfile", () => {
    it("should get user profile", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: "user-123",
            email: "test@example.com",
            username: "testuser",
          },
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiService.getUserProfile();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/users/profile");
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("updateProfile", () => {
    it("should update user profile", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { username: "newusername" },
        },
      };
      mockAxiosInstance.put.mockResolvedValue(mockResponse);

      const updates = { username: "newusername" };
      const result = await apiService.updateProfile(updates);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith("/users/profile", updates);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("toggleFavorite", () => {
    it("should toggle favorite status", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { favorited: true, locationId: "loc-123" },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await apiService.toggleFavorite("loc-123");

      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/locations/loc-123/favorite");
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("getFavorites", () => {
    it("should get user favorites", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [{ id: "loc-1" }, { id: "loc-2" }],
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiService.getFavorites();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/users/favorites");
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("getRoutes", () => {
    it("should get routes with default params", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [{ id: "route-1", title: "Test Route" }],
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiService.getRoutes();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/routes", {
        params: { sort: "popular", limit: 50 },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should get routes with custom params", async () => {
      const mockResponse = {
        data: { success: true, data: [] },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await apiService.getRoutes("new", 10);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/routes", {
        params: { sort: "new", limit: 10 },
      });
    });
  });

  describe("createRoute", () => {
    it("should create a new route", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { id: "route-new", title: "My Route" },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const routeData = {
        title: "My Route",
        description: "A test route",
        locationIds: ["loc-1"],
      };
      const result = await apiService.createRoute(routeData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/routes", routeData);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("deleteRoute", () => {
    it("should delete a route", async () => {
      const mockResponse = {
        data: { success: true },
      };
      mockAxiosInstance.delete.mockResolvedValue(mockResponse);

      const result = await apiService.deleteRoute("route-123");

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith("/routes/route-123");
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("getLeaderboard", () => {
    it("should get leaderboard data", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            { userId: "user-1", username: "topuser", score: 100 },
          ],
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await apiService.getLeaderboard();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/leaderboard");
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("checkDuplicate", () => {
    it("should check for duplicate location", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { isDuplicate: false, location: null, hasPendingSuggestion: false },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const request = { lat: 32.77, lng: -96.79, address: "123 Main St" };
      const result = await apiService.checkDuplicate(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/locations/check-duplicate",
        request
      );
      expect(result).toEqual(mockResponse.data);
    });
  });
});
