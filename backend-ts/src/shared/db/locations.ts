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
 * Increment like count for a location.
 */
export async function incrementLikeCount(locationId: string): Promise<void> {
  const tableName = getLocationsTableName();

  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `location#${locationId}`,
        SK: "metadata",
      },
      UpdateExpression: "SET likeCount = if_not_exists(likeCount, :zero) + :inc",
      ExpressionAttributeValues: {
        ":zero": 0,
        ":inc": 1,
      },
    })
  );
}

/**
 * Decrement like count for a location (minimum 0).
 */
export async function decrementLikeCount(locationId: string): Promise<void> {
  const tableName = getLocationsTableName();

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `location#${locationId}`,
          SK: "metadata",
        },
        UpdateExpression: "SET likeCount = likeCount - :dec",
        ConditionExpression: "likeCount > :zero",
        ExpressionAttributeValues: {
          ":zero": 0,
          ":dec": 1,
        },
      })
    );
  } catch (error) {
    if ((error as Error).name === "ConditionalCheckFailedException") {
      console.log(`Like count already at 0 for location ${locationId}`);
    } else {
      throw error;
    }
  }
}

/**
 * Increment report count and return new count.
 */
export async function incrementReportCount(locationId: string): Promise<number> {
  const tableName = getLocationsTableName();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `location#${locationId}`,
        SK: "metadata",
      },
      UpdateExpression: "SET reportCount = if_not_exists(reportCount, :zero) + :inc",
      ExpressionAttributeValues: {
        ":zero": 0,
        ":inc": 1,
      },
      ReturnValues: "ALL_NEW",
    })
  );

  return (result.Attributes?.reportCount as number) ?? 0;
}

/**
 * Increment view count for a location.
 */
export async function incrementViewCount(locationId: string): Promise<void> {
  const tableName = getLocationsTableName();

  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `location#${locationId}`,
        SK: "metadata",
      },
      UpdateExpression: "SET viewCount = if_not_exists(viewCount, :zero) + :inc",
      ExpressionAttributeValues: {
        ":zero": 0,
        ":inc": 1,
      },
    })
  );
}

/**
 * Increment save count for a location.
 */
export async function incrementSaveCount(locationId: string): Promise<void> {
  const tableName = getLocationsTableName();

  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `location#${locationId}`,
        SK: "metadata",
      },
      UpdateExpression: "SET saveCount = if_not_exists(saveCount, :zero) + :inc",
      ExpressionAttributeValues: {
        ":zero": 0,
        ":inc": 1,
      },
    })
  );
}

/**
 * Decrement save count for a location (minimum 0).
 */
export async function decrementSaveCount(locationId: string): Promise<void> {
  const tableName = getLocationsTableName();

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `location#${locationId}`,
          SK: "metadata",
        },
        UpdateExpression: "SET saveCount = saveCount - :dec",
        ConditionExpression: "saveCount > :zero",
        ExpressionAttributeValues: {
          ":zero": 0,
          ":dec": 1,
        },
      })
    );
  } catch (error) {
    if ((error as Error).name === "ConditionalCheckFailedException") {
      console.log(`Save count already at 0 for location ${locationId}`);
    } else {
      throw error;
    }
  }
}
