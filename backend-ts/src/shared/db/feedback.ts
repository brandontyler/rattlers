/**
 * Feedback table operations.
 *
 * Handles user feedback (likes, favorites) on locations.
 */

import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { docClient, getTableName } from "./client";
import type { Feedback, FeedbackRecord, FeedbackType } from "../types";

/**
 * Get the feedback table name from environment.
 */
function getFeedbackTableName(): string {
  return getTableName("FEEDBACK_TABLE_NAME");
}

/**
 * Remove DynamoDB-specific keys from a feedback record.
 */
function cleanFeedbackRecord(record: FeedbackRecord): Feedback {
  const { PK: _pk, SK: _sk, ...feedback } = record;
  return feedback;
}

/**
 * Create a new feedback record.
 */
export async function createFeedback(feedback: Feedback): Promise<Feedback> {
  const tableName = getFeedbackTableName();

  const item: FeedbackRecord = {
    ...feedback,
    PK: `feedback#${feedback.id}`,
    SK: `location#${feedback.locationId}`,
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
 * Create feedback with conditional write to prevent duplicates.
 *
 * @returns Tuple of [success, errorCode]
 */
export async function createFeedbackAtomic(
  feedback: Feedback
): Promise<{ success: boolean; errorCode?: string }> {
  const tableName = getFeedbackTableName();

  const item: FeedbackRecord = {
    ...feedback,
    PK: `feedback#${feedback.id}`,
    SK: `location#${feedback.locationId}`,
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
      console.log(`Conditional write failed: feedback already exists for PK=${item.PK}`);
      return { success: false, errorCode: "ConditionalCheckFailedException" };
    }
    console.error(`Unexpected error creating feedback: ${error}`);
    return { success: false, errorCode: (error as Error).name };
  }
}

/**
 * Delete a feedback record.
 */
export async function deleteFeedback(feedbackId: string, locationId: string): Promise<void> {
  const tableName = getFeedbackTableName();

  await docClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: `feedback#${feedbackId}`,
        SK: `location#${locationId}`,
      },
    })
  );
}

/**
 * Get a user's feedback for a specific location and type.
 */
export async function getUserFeedback(
  locationId: string,
  userId: string,
  feedbackType: FeedbackType
): Promise<Feedback | null> {
  const tableName = getFeedbackTableName();

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: "userId-locationId-index",
        KeyConditionExpression: "userId = :userId AND locationId = :locationId",
        FilterExpression: "#type = :type",
        ExpressionAttributeNames: {
          "#type": "type",
        },
        ExpressionAttributeValues: {
          ":userId": userId,
          ":locationId": locationId,
          ":type": feedbackType,
        },
        Limit: 1,
      })
    );

    const items = result.Items ?? [];
    return items.length > 0 ? cleanFeedbackRecord(items[0] as FeedbackRecord) : null;
  } catch (error) {
    console.error(`Error querying user feedback with GSI: ${error}`);
    // Fallback to scan if GSI query fails
    return getUserFeedbackScan(locationId, userId, feedbackType);
  }
}

/**
 * Fallback scan method for backwards compatibility.
 */
async function getUserFeedbackScan(
  locationId: string,
  userId: string,
  feedbackType: FeedbackType
): Promise<Feedback | null> {
  const tableName = getFeedbackTableName();

  const result = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: "locationId = :locationId AND userId = :userId AND #type = :type",
      ExpressionAttributeNames: {
        "#type": "type",
      },
      ExpressionAttributeValues: {
        ":locationId": locationId,
        ":userId": userId,
        ":type": feedbackType,
      },
      Limit: 1,
    })
  );

  const items = result.Items ?? [];
  return items.length > 0 ? cleanFeedbackRecord(items[0] as FeedbackRecord) : null;
}

/**
 * Get all feedback for a location.
 */
export async function getFeedbackByLocation(
  locationId: string,
  limit = 100
): Promise<Feedback[]> {
  const tableName = getFeedbackTableName();

  const result = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: "locationId = :locationId",
      ExpressionAttributeValues: {
        ":locationId": locationId,
      },
      Limit: limit,
    })
  );

  return (result.Items ?? []).map((item) => cleanFeedbackRecord(item as FeedbackRecord));
}

/**
 * Get all favorites for a user.
 */
export async function getUserFavorites(userId: string): Promise<Feedback[]> {
  const tableName = getFeedbackTableName();

  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "userId-locationId-index",
      KeyConditionExpression: "userId = :userId",
      FilterExpression: "#type = :type",
      ExpressionAttributeNames: {
        "#type": "type",
      },
      ExpressionAttributeValues: {
        ":userId": userId,
        ":type": "favorite",
      },
    })
  );

  return (result.Items ?? []).map((item) => cleanFeedbackRecord(item as FeedbackRecord));
}
