/**
 * Route feedback table operations.
 *
 * Handles user feedback (likes, saves) on routes.
 */

import {
  PutCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { docClient, getTableName } from "./client";
import type { RouteFeedback, RouteFeedbackRecord } from "../types";

/**
 * Get the route feedback table name from environment.
 */
function getRouteFeedbackTableName(): string {
  return getTableName("ROUTE_FEEDBACK_TABLE_NAME");
}

/**
 * Remove DynamoDB-specific keys from a route feedback record.
 */
function cleanRouteFeedbackRecord(record: RouteFeedbackRecord): RouteFeedback {
  const { PK: _pk, SK: _sk, ...feedback } = record;
  return feedback;
}

/**
 * Create a new route feedback record.
 */
export async function createRouteFeedback(feedback: RouteFeedback): Promise<RouteFeedback> {
  const tableName = getRouteFeedbackTableName();

  const item: RouteFeedbackRecord = {
    ...feedback,
    PK: `routeFeedback#${feedback.id}`,
    SK: `route#${feedback.routeId}`,
  };

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    })
  );

  return feedback;
}

/**
 * Create route feedback with conditional write to prevent duplicates.
 */
export async function createRouteFeedbackAtomic(
  feedback: RouteFeedback
): Promise<{ success: boolean; errorCode?: string }> {
  const tableName = getRouteFeedbackTableName();

  const item: RouteFeedbackRecord = {
    ...feedback,
    PK: `routeFeedback#${feedback.id}`,
    SK: `route#${feedback.routeId}`,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      })
    );
    return { success: true };
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      console.log(`Conditional write failed: route feedback already exists for PK=${item.PK}`);
      return { success: false, errorCode: "ConditionalCheckFailedException" };
    }
    console.error(`Unexpected error creating route feedback: ${error}`);
    return { success: false, errorCode: (error as Error).name };
  }
}

/**
 * Delete a route feedback record.
 */
export async function deleteRouteFeedback(feedbackId: string, routeId: string): Promise<void> {
  const tableName = getRouteFeedbackTableName();

  await docClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: `routeFeedback#${feedbackId}`,
        SK: `route#${routeId}`,
      },
    })
  );
}

/**
 * Get a user's feedback for a specific route and type.
 */
export async function getUserRouteFeedback(
  routeId: string,
  userId: string,
  feedbackType: "like" | "save"
): Promise<RouteFeedback | null> {
  const tableName = getRouteFeedbackTableName();

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: "userId-routeId-index",
        KeyConditionExpression: "userId = :userId AND routeId = :routeId",
        FilterExpression: "#type = :type",
        ExpressionAttributeNames: {
          "#type": "type",
        },
        ExpressionAttributeValues: {
          ":userId": userId,
          ":routeId": routeId,
          ":type": feedbackType,
        },
        Limit: 1,
      })
    );

    const items = result.Items ?? [];
    return items.length > 0 ? cleanRouteFeedbackRecord(items[0] as RouteFeedbackRecord) : null;
  } catch (error) {
    console.error(`Error querying user route feedback: ${error}`);
    return null;
  }
}

/**
 * Get all feedback types for a user on a specific route.
 */
export async function getUserRouteFeedbackAllTypes(
  routeId: string,
  userId: string
): Promise<{ liked: boolean; saved: boolean }> {
  const tableName = getRouteFeedbackTableName();

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: "userId-routeId-index",
        KeyConditionExpression: "userId = :userId AND routeId = :routeId",
        ExpressionAttributeValues: {
          ":userId": userId,
          ":routeId": routeId,
        },
      })
    );

    const items = result.Items ?? [];
    const feedback = { liked: false, saved: false };

    for (const item of items) {
      const type = (item as RouteFeedbackRecord).type;
      if (type === "like") {
        feedback.liked = true;
      } else if (type === "save") {
        feedback.saved = true;
      }
    }

    return feedback;
  } catch (error) {
    console.error(`Error querying user route feedback: ${error}`);
    return { liked: false, saved: false };
  }
}

/**
 * Get all route IDs that a user has saved.
 */
export async function getUserSavedRouteIds(userId: string): Promise<string[]> {
  const tableName = getRouteFeedbackTableName();

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: "userId-routeId-index",
        KeyConditionExpression: "userId = :userId",
        FilterExpression: "#type = :type",
        ExpressionAttributeNames: {
          "#type": "type",
        },
        ExpressionAttributeValues: {
          ":userId": userId,
          ":type": "save",
        },
      })
    );

    return (result.Items ?? []).map((item) => (item as RouteFeedbackRecord).routeId);
  } catch (error) {
    console.error(`Error querying user saved routes: ${error}`);
    return [];
  }
}

/**
 * Delete all feedback records for a route.
 */
export async function deleteAllRouteFeedback(routeId: string): Promise<void> {
  const tableName = getRouteFeedbackTableName();

  const result = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: "routeId = :routeId",
      ExpressionAttributeValues: {
        ":routeId": routeId,
      },
    })
  );

  const items = result.Items ?? [];
  for (const item of items) {
    const record = item as RouteFeedbackRecord;
    await docClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: {
          PK: record.PK,
          SK: record.SK,
        },
      })
    );
  }
}
