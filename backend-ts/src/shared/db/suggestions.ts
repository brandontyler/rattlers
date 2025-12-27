/**
 * Suggestions table operations.
 *
 * Handles user-submitted location suggestions pending admin review.
 */

import {
  PutCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "./client";
import type { Suggestion, SuggestionRecord, SuggestionStatus } from "../types";

/**
 * Get the suggestions table name from environment.
 */
function getSuggestionsTableName(): string {
  return getTableName("SUGGESTIONS_TABLE_NAME");
}

/**
 * Remove DynamoDB-specific keys from a suggestion record.
 */
function cleanSuggestionRecord(record: SuggestionRecord): Suggestion {
  const { PK: _pk, SK: _sk, ...suggestion } = record;
  return suggestion;
}

/**
 * Create a new suggestion.
 */
export async function createSuggestion(suggestion: Suggestion): Promise<Suggestion> {
  const tableName = getSuggestionsTableName();

  const item: SuggestionRecord = {
    ...suggestion,
    PK: `suggestion#${suggestion.id}`,
    SK: `status#${suggestion.status}`,
  };

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    })
  );

  return suggestion;
}

/**
 * Get a suggestion by ID.
 */
export async function getSuggestion(suggestionId: string): Promise<Suggestion | null> {
  const tableName = getSuggestionsTableName();

  // Query with PK prefix (we don't know SK status)
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `suggestion#${suggestionId}`,
      },
    })
  );

  const items = result.Items ?? [];
  return items.length > 0 ? cleanSuggestionRecord(items[0] as SuggestionRecord) : null;
}

/**
 * Update suggestion status.
 */
export async function updateSuggestionStatus(
  suggestionId: string,
  status: SuggestionStatus,
  reviewedBy: string,
  reviewedAt: string
): Promise<void> {
  const tableName = getSuggestionsTableName();

  // Get current item to delete old SK
  const current = await getSuggestion(suggestionId);
  if (!current) {
    return;
  }

  // Delete old item
  await docClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: `suggestion#${suggestionId}`,
        SK: `status#${current.status}`,
      },
    })
  );

  // Create new item with updated status
  const updated: SuggestionRecord = {
    ...current,
    status,
    reviewedBy,
    reviewedAt,
    PK: `suggestion#${suggestionId}`,
    SK: `status#${status}`,
  };

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: updated,
    })
  );
}

/**
 * List suggestions by status.
 */
export async function listSuggestionsByStatus(
  status: SuggestionStatus = "pending",
  limit = 50
): Promise<Suggestion[]> {
  const tableName = getSuggestionsTableName();

  const result = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: "#status = :status",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": status,
      },
      Limit: limit,
    })
  );

  return (result.Items ?? []).map((item) => cleanSuggestionRecord(item as SuggestionRecord));
}

/**
 * Get suggestions by user ID.
 */
export async function getSuggestionsByUser(userId: string): Promise<Suggestion[]> {
  const tableName = getSuggestionsTableName();

  const result = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: "submittedBy = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    })
  );

  return (result.Items ?? []).map((item) => cleanSuggestionRecord(item as SuggestionRecord));
}
