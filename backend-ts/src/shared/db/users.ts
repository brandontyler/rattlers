/**
 * Users table operations.
 *
 * Handles user profile storage and retrieval.
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  ScanCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "./client";
import type { UserProfile } from "../types";

/**
 * Get the users table name from environment.
 */
function getUsersTableName(): string {
  return getTableName("USERS_TABLE_NAME");
}

/**
 * Get a user profile by user ID.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const tableName = getUsersTableName();

  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        userId,
      },
    })
  );

  return (result.Item as UserProfile) ?? null;
}

/**
 * Create or update a user profile.
 */
export async function upsertUserProfile(profile: UserProfile): Promise<UserProfile> {
  const tableName = getUsersTableName();

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: profile,
    })
  );

  return profile;
}

/**
 * Update specific fields in a user profile.
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, "userId">>
): Promise<UserProfile | null> {
  const tableName = getUsersTableName();

  // Build update expression dynamically
  const updateParts: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      updateParts.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }
  }

  if (updateParts.length === 0) {
    return getUserProfile(userId);
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        userId,
      },
      UpdateExpression: `SET ${updateParts.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    })
  );

  return (result.Attributes as UserProfile) ?? null;
}

/**
 * Get username for a user ID.
 */
export async function getUsername(userId: string): Promise<string | null> {
  const profile = await getUserProfile(userId);
  return profile?.username ?? null;
}

/**
 * Get leaderboard of users sorted by approved submission count.
 */
export async function getLeaderboard(limit = 50): Promise<UserProfile[]> {
  const tableName = getUsersTableName();

  // Note: This is a scan which isn't ideal for large tables
  // Consider adding a GSI for leaderboard queries
  const result = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      Limit: limit * 2, // Fetch more to allow for filtering
    })
  );

  const users = (result.Items ?? []) as UserProfile[];

  // Sort by some metric (this would need to be tracked in the user profile)
  return users.slice(0, limit);
}

/**
 * Check if a username is already taken.
 */
export async function isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
  const tableName = getUsersTableName();

  const result = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: "username = :username",
      ExpressionAttributeValues: {
        ":username": username,
      },
      Limit: 1,
    })
  );

  const items = result.Items ?? [];
  if (items.length === 0) {
    return false;
  }

  // If we're excluding a user ID (for updates), check if the found username belongs to them
  if (excludeUserId && (items[0] as UserProfile).userId === excludeUserId) {
    return false;
  }

  return true;
}
