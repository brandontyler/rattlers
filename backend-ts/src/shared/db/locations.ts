/**
 * Locations table operations.
 *
 * Provides CRUD operations for Christmas light locations.
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "./client";
import type { Location, LocationRecord, LocationStatus } from "../types";

/**
 * Get the locations table name from environment.
 */
function getLocationsTableName(): string {
  return getTableName("LOCATIONS_TABLE_NAME");
}

/**
 * Remove DynamoDB-specific keys from a location record.
 */
function cleanLocationRecord(record: LocationRecord): Location {
  const { PK: _pk, SK: _sk, ...location } = record;
  return location;
}

/**
 * Create a new location.
 */
export async function createLocation(location: Location): Promise<Location> {
  const tableName = getLocationsTableName();

  const item: LocationRecord = {
    ...location,
    PK: `location#${location.id}`,
    SK: "metadata",
  };

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    })
  );

  return location;
}

/**
 * Get a location by ID.
 */
export async function getLocation(locationId: string): Promise<Location | null> {
  const tableName = getLocationsTableName();

  console.log(`LocationsTable.get() - table: ${tableName}, PK: location#${locationId}, SK: metadata`);

  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        PK: `location#${locationId}`,
        SK: "metadata",
      },
    })
  );

  console.log(`LocationsTable.get() - found: ${result.Item != null}`);

  if (!result.Item) {
    return null;
  }

  return cleanLocationRecord(result.Item as LocationRecord);
}

/**
 * Get multiple locations by their IDs in a single batch request.
 *
 * First principles: When you need N specific items, fetch exactly those N items.
 * Don't scan the entire table and filter. DynamoDB BatchGetItem is O(N) for N items,
 * while a scan is O(total_items) regardless of how many you need.
 *
 * @param locationIds - Array of location IDs to fetch
 * @returns Map of locationId -> Location for efficient lookup
 */
export async function getLocationsByIds(
  locationIds: string[]
): Promise<Map<string, Location>> {
  if (locationIds.length === 0) {
    return new Map();
  }

  const tableName = getLocationsTableName();
  const results = new Map<string, Location>();

  // DynamoDB BatchGetItem has a limit of 100 items per request
  const BATCH_SIZE = 100;

  for (let i = 0; i < locationIds.length; i += BATCH_SIZE) {
    const batch = locationIds.slice(i, i + BATCH_SIZE);

    const keys = batch.map((id) => ({
      PK: `location#${id}`,
      SK: "metadata",
    }));

    const result = await docClient.send(
      new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: keys,
          },
        },
      })
    );

    const items = result.Responses?.[tableName] ?? [];
    for (const item of items) {
      const location = cleanLocationRecord(item as LocationRecord);
      results.set(location.id, location);
    }
  }

  return results;
}

/**
 * Update a location.
 */
export async function updateLocation(
  locationId: string,
  updates: Partial<Location>
): Promise<Location | null> {
  const tableName = getLocationsTableName();

  // Build update expression dynamically
  const updateParts: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      const cleanKey = key.replace(/[_-]/g, "");
      updateParts.push(`#${cleanKey} = :${cleanKey}`);
      expressionAttributeNames[`#${cleanKey}`] = key;
      expressionAttributeValues[`:${cleanKey}`] = value;
    }
  }

  if (updateParts.length === 0) {
    return getLocation(locationId);
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `location#${locationId}`,
        SK: "metadata",
      },
      UpdateExpression: `SET ${updateParts.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    })
  );

  if (!result.Attributes) {
    return null;
  }

  return cleanLocationRecord(result.Attributes as LocationRecord);
}

/**
 * Soft delete a location by setting status to inactive.
 */
export async function deleteLocation(locationId: string): Promise<void> {
  await updateLocation(locationId, { status: "inactive" });
}

/**
 * List all locations with optional status filter.
 */
export async function listLocations(options: {
  status?: LocationStatus;
  limit?: number;
}): Promise<Location[]> {
  const { status = "active", limit = 500 } = options;
  const tableName = getLocationsTableName();

  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "status-createdAt-index",
      KeyConditionExpression: "#status = :status",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": status,
      },
      Limit: limit,
      ScanIndexForward: false, // Newest first
    })
  );

  return (result.Items ?? []).map((item) => cleanLocationRecord(item as LocationRecord));
}

/**
 * Counter field names that can be adjusted.
 */
export type CounterField = "likeCount" | "saveCount" | "reportCount" | "viewCount";

/**
 * Adjust a counter field for a location (increment or decrement).
 *
 * First principles: All counter operations are the same pattern:
 * - Increment: Add 1, initialize to 0 if not exists
 * - Decrement: Subtract 1, but never go below 0
 *
 * This single function replaces 6 nearly-identical functions,
 * reducing code duplication and maintenance burden.
 *
 * @param locationId - The location to update
 * @param field - The counter field to adjust
 * @param delta - Positive to increment, negative to decrement
 * @returns The new counter value (only for increment operations)
 */
export async function adjustCounter(
  locationId: string,
  field: CounterField,
  delta: number
): Promise<number | undefined> {
  const tableName = getLocationsTableName();

  if (delta > 0) {
    // Increment: Initialize to 0 if not exists, then add
    const result = await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `location#${locationId}`,
          SK: "metadata",
        },
        UpdateExpression: `SET #field = if_not_exists(#field, :zero) + :delta`,
        ExpressionAttributeNames: {
          "#field": field,
        },
        ExpressionAttributeValues: {
          ":zero": 0,
          ":delta": delta,
        },
        ReturnValues: "ALL_NEW",
      })
    );
    // Return 0 if DynamoDB didn't return attributes (edge case, maintains backwards compat)
    return (result.Attributes?.[field] as number) ?? 0;
  } else if (delta < 0) {
    // Decrement: Only if current value > 0 to prevent negative counts
    try {
      const result = await docClient.send(
        new UpdateCommand({
          TableName: tableName,
          Key: {
            PK: `location#${locationId}`,
            SK: "metadata",
          },
          UpdateExpression: `SET #field = #field + :delta`,
          ConditionExpression: "#field > :zero",
          ExpressionAttributeNames: {
            "#field": field,
          },
          ExpressionAttributeValues: {
            ":zero": 0,
            ":delta": delta,
          },
          ReturnValues: "ALL_NEW",
        })
      );
      return (result.Attributes?.[field] as number) ?? 0;
    } catch (error) {
      if ((error as Error).name === "ConditionalCheckFailedException") {
        console.log(`${field} already at 0 for location ${locationId}`);
        return 0;
      }
      throw error;
    }
  }
  return undefined;
}

// Convenience wrappers for backwards compatibility and readability

/**
 * Increment like count for a location.
 */
export async function incrementLikeCount(locationId: string): Promise<void> {
  await adjustCounter(locationId, "likeCount", 1);
}

/**
 * Decrement like count for a location (minimum 0).
 */
export async function decrementLikeCount(locationId: string): Promise<void> {
  await adjustCounter(locationId, "likeCount", -1);
}

/**
 * Increment report count and return new count.
 */
export async function incrementReportCount(locationId: string): Promise<number> {
  return (await adjustCounter(locationId, "reportCount", 1)) ?? 0;
}

/**
 * Increment view count for a location.
 */
export async function incrementViewCount(locationId: string): Promise<void> {
  await adjustCounter(locationId, "viewCount", 1);
}

/**
 * Increment save count for a location.
 */
export async function incrementSaveCount(locationId: string): Promise<void> {
  await adjustCounter(locationId, "saveCount", 1);
}

/**
 * Decrement save count for a location (minimum 0).
 */
export async function decrementSaveCount(locationId: string): Promise<void> {
  await adjustCounter(locationId, "saveCount", -1);
}
