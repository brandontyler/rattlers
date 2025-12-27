/**
 * Lambda function to get routes created by a user.
 *
 * GET /users/{userId}/routes
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, badRequestError, internalError } from "@shared/utils/responses";
import { listRoutesByUser } from "@shared/db/routes";

/**
 * Handle GET /users/{userId}/routes request.
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

    // Get routes created by this user
    const routes = await listRoutesByUser(userId);

    return successResponse({ data: routes });
  } catch (error) {
    console.error("Error getting user routes:", error);
    return internalError();
  }
}
