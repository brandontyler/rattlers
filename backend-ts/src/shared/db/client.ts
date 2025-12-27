/**
 * DynamoDB client configuration.
 *
 * Provides a singleton DynamoDB Document Client instance
 * configured for use across all Lambda functions.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/**
 * Base DynamoDB client.
 */
const client = new DynamoDBClient({});

/**
 * DynamoDB Document Client with automatic marshalling/unmarshalling.
 *
 * Configured to:
 * - Remove undefined values from items
 * - Convert empty strings to null
 * - Convert numbers stored as strings back to numbers
 */
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

/**
 * Get table name from environment variable.
 */
export function getTableName(envVar: string): string {
  const tableName = process.env[envVar];
  if (!tableName) {
    throw new Error(`Environment variable ${envVar} is not set`);
  }
  return tableName;
}
