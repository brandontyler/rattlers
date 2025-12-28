/**
 * Lambda function to get routes created by a user.
 *
 * GET /users/routes
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, internalError } from "@shared/utils/responses";
import { listRoutesByUser } from "@shared/db/routes";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import type { AuthenticatedEvent } from "@shared/types";

/**
 * Handle GET /users/routes request.
 */
export const handler = requireAuth(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const user = getUserInfo(event);

      if (!user) {
        return internalError();
      }

      // Get routes created by this user
      const routes = await listRoutesByUser(user.id);

      return successResponse({ data: routes });
    } catch (error) {
      console.error("Error getting user routes:", error);
      return internalError();
    }
  }
);
