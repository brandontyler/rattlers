/**
 * Lambda function to get a user's profile.
 *
 * GET /users/{userId}/profile
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, notFoundError, badRequestError, internalError } from "@shared/utils/responses";
import { getUserProfile } from "@shared/db/users";

/**
 * Handle GET /users/{userId}/profile request.
 */
export async function handler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return badRequestError("User ID is required");
    }

    // Get user profile
    const profile = await getUserProfile(userId);

    if (!profile) {
      return notFoundError("User not found");
    }

    return successResponse({ data: profile });
  } catch (error) {
    console.error("Error getting user profile:", error);
    return internalError();
  }
}
