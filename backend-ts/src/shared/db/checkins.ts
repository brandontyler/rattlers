/**
 * Check-ins table operations.
 *
 * Handles live status check-ins on locations.
 */

import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "./client";
import type { CheckIn, CheckInRecord } from "../types";

/**
 * Get the check-ins table name from environment.
 */
function getCheckInsTableName(): string {
  return getTableName("CHECKINS_TABLE_NAME");
}

/**
 * Remove DynamoDB-specific keys from a check-in record.
 */
function cleanCheckInRecord(record: CheckInRecord): CheckIn {
  const { PK: _pk, SK: _sk, ...checkIn } = record;
  return checkIn;
}

/**
 * Create a new check-in record.
 */
export async function createCheckIn(checkIn: CheckIn): Promise<CheckIn> {
  const tableName = getCheckInsTableName();

  const item: CheckInRecord = {
    ...checkIn,
    PK: `checkin#${checkIn.id}`,
    SK: `location#${checkIn.locationId}`,
  };

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    })
  );

  return checkIn;
}

/**
 * Get check-ins for a location, ordered by most recent first.
 */
export async function getCheckInsByLocation(
  locationId: string,
  limit = 10
): Promise<CheckIn[]> {
  const tableName = getCheckInsTableName();

  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "locationId-createdAt-index",
      KeyConditionExpression: "locationId = :locationId",
      ExpressionAttributeValues: {
        ":locationId": locationId,
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    })
  );

  return (result.Items ?? []).map((item) => cleanCheckInRecord(item as CheckInRecord));
}

/**
 * Get the latest check-in for a location.
 */
export async function getLatestCheckIn(locationId: string): Promise<CheckIn | null> {
  const checkIns = await getCheckInsByLocation(locationId, 1);
  return checkIns.length > 0 ? checkIns[0] : null;
}

/**
 * Get check-ins by a user, ordered by most recent first.
 */
export async function getCheckInsByUser(
  userId: string,
  limit = 50
): Promise<CheckIn[]> {
  const tableName = getCheckInsTableName();

  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "userId-createdAt-index",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    })
  );

  return (result.Items ?? []).map((item) => cleanCheckInRecord(item as CheckInRecord));
}

/**
 * Count check-ins for a location.
 */
export async function countCheckInsForLocation(locationId: string): Promise<number> {
  const tableName = getCheckInsTableName();

  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "locationId-createdAt-index",
      KeyConditionExpression: "locationId = :locationId",
      ExpressionAttributeValues: {
        ":locationId": locationId,
      },
      Select: "COUNT",
    })
  );

  return result.Count ?? 0;
}

/**
 * Count check-ins by a user.
 */
export async function countCheckInsByUser(userId: string): Promise<number> {
  const tableName = getCheckInsTableName();

  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "userId-createdAt-index",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
      Select: "COUNT",
    })
  );

  return result.Count ?? 0;
}
