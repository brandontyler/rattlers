/**
 * Lambda function to get user's feedback status for a route.
 *
 * GET /routes/{id}/feedback/status
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, badRequestError, internalError } from "@shared/utils/responses";
import { getUserRouteFeedbackAllTypes } from "@shared/db/route-feedback";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import type { AuthenticatedEvent } from "@shared/types";

/**
 * Handle GET /routes/{id}/feedback/status request.
 */
export const handler = requireAuth(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const user = getUserInfo(event);
      const routeId = event.pathParameters?.id;

      if (!routeId) {
        return badRequestError("Route ID is required");
      }

      if (!user) {
        return internalError();
      }

      // Get all feedback types for this user on this route
      const status = await getUserRouteFeedbackAllTypes(routeId, user.id);

      return successResponse({ data: status });
    } catch (error) {
      console.error("Error getting route feedback status:", error);
      return internalError();
    }
  }
);
