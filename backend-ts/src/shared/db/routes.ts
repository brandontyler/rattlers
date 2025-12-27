/**
 * Routes table operations.
 *
 * Handles curated Christmas light viewing routes.
 */

import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "./client";
import type { Route, RouteRecord, RouteStatus } from "../types";

/**
 * Get the routes table name from environment.
 */
function getRoutesTableName(): string {
  return getTableName("ROUTES_TABLE_NAME");
}

/**
 * Remove DynamoDB-specific keys from a route record.
 */
function cleanRouteRecord(record: RouteRecord): Route {
  const { PK: _pk, SK: _sk, ...route } = record;
  return route;
}

/**
 * Create a new route.
 */
export async function createRoute(route: Route): Promise<Route> {
  const tableName = getRoutesTableName();

  const item: RouteRecord = {
    ...route,
    PK: `route#${route.id}`,
    SK: "metadata",
  };

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    })
  );

  return route;
}

/**
 * Get a route by ID.
 */
export async function getRoute(routeId: string): Promise<Route | null> {
  const tableName = getRoutesTableName();

  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        PK: `route#${routeId}`,
        SK: "metadata",
      },
    })
  );

  if (!result.Item) {
    return null;
  }

  return cleanRouteRecord(result.Item as RouteRecord);
}

/**
 * Update a route.
 */
export async function updateRoute(
  routeId: string,
  updates: Partial<Route>
): Promise<Route | null> {
  const tableName = getRoutesTableName();

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
    return getRoute(routeId);
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `route#${routeId}`,
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

  return cleanRouteRecord(result.Attributes as RouteRecord);
}

/**
 * Hard delete a route.
 */
export async function deleteRoute(routeId: string): Promise<void> {
  const tableName = getRoutesTableName();

  await docClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: `route#${routeId}`,
        SK: "metadata",
      },
    })
  );
}

/**
 * List public routes.
 */
export async function listPublicRoutes(options: {
  sortBy?: "popular" | "new";
  limit?: number;
}): Promise<Route[]> {
  const { sortBy = "popular", limit = 50 } = options;
  const tableName = getRoutesTableName();

  const indexName = sortBy === "popular" ? "status-likeCount-index" : "status-createdAt-index";

  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: indexName,
      KeyConditionExpression: "#status = :status",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": "active",
      },
      Limit: limit,
      ScanIndexForward: false, // Descending order
    })
  );

  return (result.Items ?? []).map((item) => cleanRouteRecord(item as RouteRecord));
}

/**
 * List routes created by a specific user.
 */
export async function listRoutesByUser(userId: string, limit = 50): Promise<Route[]> {
  const tableName = getRoutesTableName();

  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "createdBy-createdAt-index",
      KeyConditionExpression: "createdBy = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
      Limit: limit,
      ScanIndexForward: false, // Newest first
    })
  );

  return (result.Items ?? []).map((item) => cleanRouteRecord(item as RouteRecord));
}

/**
 * Increment like count for a route.
 */
export async function incrementRouteLikeCount(routeId: string): Promise<void> {
  const tableName = getRoutesTableName();

  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `route#${routeId}`,
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
 * Decrement like count for a route (minimum 0).
 */
export async function decrementRouteLikeCount(routeId: string): Promise<void> {
  const tableName = getRoutesTableName();

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `route#${routeId}`,
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
      console.log(`Like count already at 0 for route ${routeId}`);
    } else {
      throw error;
    }
  }
}

/**
 * Increment save count for a route.
 */
export async function incrementRouteSaveCount(routeId: string): Promise<void> {
  const tableName = getRoutesTableName();

  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `route#${routeId}`,
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
 * Decrement save count for a route (minimum 0).
 */
export async function decrementRouteSaveCount(routeId: string): Promise<void> {
  const tableName = getRoutesTableName();

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `route#${routeId}`,
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
      console.log(`Save count already at 0 for route ${routeId}`);
    } else {
      throw error;
    }
  }
}

/**
 * Increment start count for a route.
 */
export async function incrementRouteStartCount(routeId: string): Promise<void> {
  const tableName = getRoutesTableName();

  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `route#${routeId}`,
        SK: "metadata",
      },
      UpdateExpression: "SET startCount = if_not_exists(startCount, :zero) + :inc",
      ExpressionAttributeValues: {
        ":zero": 0,
        ":inc": 1,
      },
    })
  );
}
