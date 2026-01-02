/**
 * Tests for locations database operations.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import {
  createLocation,
  getLocation,
  updateLocation,
  deleteLocation,
  listLocations,
  incrementLikeCount,
  decrementLikeCount,
  incrementReportCount,
  incrementViewCount,
  incrementSaveCount,
  decrementSaveCount,
} from "./locations";
import type { Location } from "../types";

// Mock the DynamoDB client
const ddbMock = mockClient(DynamoDBDocumentClient);

// Sample location data
const sampleLocation: Location = {
  id: "loc-123",
  lat: 32.7767,
  lng: -96.797,
  address: "123 Main St, Dallas, TX",
  status: "active",
  submittedBy: "user-1",
  submittedAt: "2024-01-01T00:00:00Z",
  createdAt: "2024-01-01T00:00:00Z",
  likeCount: 10,
};

describe("Locations Database Operations", () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe("createLocation", () => {
    it("should create a new location", async () => {
      ddbMock.on(PutCommand).resolves({});

      const result = await createLocation(sampleLocation);

      expect(result).toEqual(sampleLocation);
      expect(ddbMock.calls()).toHaveLength(1);

      const putCall = ddbMock.call(0);
      expect(putCall.args[0].input).toMatchObject({
        TableName: "test-locations-table",
        Item: expect.objectContaining({
          PK: "location#loc-123",
          SK: "metadata",
          id: "loc-123",
        }),
      });
    });
  });

  describe("getLocation", () => {
    it("should return location when found", async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          PK: "location#loc-123",
          SK: "metadata",
          ...sampleLocation,
        },
      });

      const result = await getLocation("loc-123");

      expect(result).toEqual(sampleLocation);
      expect(ddbMock.calls()).toHaveLength(1);
    });

    it("should return null when location not found", async () => {
      ddbMock.on(GetCommand).resolves({
        Item: undefined,
      });

      const result = await getLocation("non-existent");

      expect(result).toBeNull();
    });

    it("should strip DynamoDB keys from result", async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          PK: "location#loc-123",
          SK: "metadata",
          id: "loc-123",
          address: "Test Address",
        },
      });

      const result = await getLocation("loc-123");

      expect(result).not.toHaveProperty("PK");
      expect(result).not.toHaveProperty("SK");
    });
  });

  describe("updateLocation", () => {
    it("should update location fields", async () => {
      ddbMock.on(UpdateCommand).resolves({
        Attributes: {
          PK: "location#loc-123",
          SK: "metadata",
          ...sampleLocation,
          description: "Updated description",
        },
      });

      const result = await updateLocation("loc-123", {
        description: "Updated description",
      });

      expect(result?.description).toBe("Updated description");
    });

    it("should return null when update fails", async () => {
      ddbMock.on(UpdateCommand).resolves({
        Attributes: undefined,
      });

      const result = await updateLocation("loc-123", { description: "Test" });

      expect(result).toBeNull();
    });

    it("should return current location when no updates provided", async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          PK: "location#loc-123",
          SK: "metadata",
          ...sampleLocation,
        },
      });

      const result = await updateLocation("loc-123", {});

      expect(result).toEqual(sampleLocation);
    });
  });

  describe("deleteLocation", () => {
    it("should soft delete by setting status to inactive", async () => {
      ddbMock.on(UpdateCommand).resolves({
        Attributes: {
          ...sampleLocation,
          status: "inactive",
        },
      });

      await deleteLocation("loc-123");

      expect(ddbMock.calls()).toHaveLength(1);
      const updateCall = ddbMock.call(0);
      expect(updateCall.args[0].input.ExpressionAttributeValues).toMatchObject({
        ":status": "inactive",
      });
    });
  });

  describe("listLocations", () => {
    it("should list active locations by default", async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [
          { PK: "location#1", SK: "metadata", id: "1", status: "active" },
          { PK: "location#2", SK: "metadata", id: "2", status: "active" },
        ],
      });

      const result = await listLocations({});

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty("PK");
    });

    it("should filter by status", async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [],
      });

      await listLocations({ status: "pending" });

      const queryCall = ddbMock.call(0);
      expect(queryCall.args[0].input.ExpressionAttributeValues).toMatchObject({
        ":status": "pending",
      });
    });

    it("should apply limit", async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [],
      });

      await listLocations({ limit: 100 });

      const queryCall = ddbMock.call(0);
      expect(queryCall.args[0].input.Limit).toBe(100);
    });

    it("should return empty array when no items", async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: undefined,
      });

      const result = await listLocations({});

      expect(result).toEqual([]);
    });
  });

  describe("incrementLikeCount", () => {
    it("should increment like count", async () => {
      ddbMock.on(UpdateCommand).resolves({});

      await incrementLikeCount("loc-123");

      expect(ddbMock.calls()).toHaveLength(1);
      const updateCall = ddbMock.call(0);
      // Now uses #field placeholder with ExpressionAttributeNames
      expect(updateCall.args[0].input.ExpressionAttributeNames).toMatchObject({
        "#field": "likeCount",
      });
    });
  });

  describe("decrementLikeCount", () => {
    it("should decrement like count", async () => {
      ddbMock.on(UpdateCommand).resolves({});

      await decrementLikeCount("loc-123");

      expect(ddbMock.calls()).toHaveLength(1);
    });

    it("should handle ConditionalCheckFailedException gracefully", async () => {
      const error = new Error("ConditionalCheckFailedException");
      error.name = "ConditionalCheckFailedException";
      ddbMock.on(UpdateCommand).rejects(error);

      // Should not throw
      await expect(decrementLikeCount("loc-123")).resolves.toBeUndefined();
    });

    it("should rethrow other errors", async () => {
      ddbMock.on(UpdateCommand).rejects(new Error("DynamoDB error"));

      await expect(decrementLikeCount("loc-123")).rejects.toThrow("DynamoDB error");
    });
  });

  describe("incrementReportCount", () => {
    it("should increment report count and return new value", async () => {
      ddbMock.on(UpdateCommand).resolves({
        Attributes: { reportCount: 5 },
      });

      const result = await incrementReportCount("loc-123");

      expect(result).toBe(5);
    });

    it("should return 0 when no attributes returned", async () => {
      ddbMock.on(UpdateCommand).resolves({
        Attributes: undefined,
      });

      const result = await incrementReportCount("loc-123");

      expect(result).toBe(0);
    });
  });

  describe("incrementViewCount", () => {
    it("should increment view count", async () => {
      ddbMock.on(UpdateCommand).resolves({});

      await incrementViewCount("loc-123");

      expect(ddbMock.calls()).toHaveLength(1);
      const updateCall = ddbMock.call(0);
      // Now uses #field placeholder with ExpressionAttributeNames
      expect(updateCall.args[0].input.ExpressionAttributeNames).toMatchObject({
        "#field": "viewCount",
      });
    });
  });

  describe("incrementSaveCount", () => {
    it("should increment save count", async () => {
      ddbMock.on(UpdateCommand).resolves({});

      await incrementSaveCount("loc-123");

      expect(ddbMock.calls()).toHaveLength(1);
      const updateCall = ddbMock.call(0);
      // Now uses #field placeholder with ExpressionAttributeNames
      expect(updateCall.args[0].input.ExpressionAttributeNames).toMatchObject({
        "#field": "saveCount",
      });
    });
  });

  describe("decrementSaveCount", () => {
    it("should decrement save count", async () => {
      ddbMock.on(UpdateCommand).resolves({});

      await decrementSaveCount("loc-123");

      expect(ddbMock.calls()).toHaveLength(1);
    });

    it("should handle ConditionalCheckFailedException gracefully", async () => {
      const error = new Error("ConditionalCheckFailedException");
      error.name = "ConditionalCheckFailedException";
      ddbMock.on(UpdateCommand).rejects(error);

      await expect(decrementSaveCount("loc-123")).resolves.toBeUndefined();
    });
  });
});
