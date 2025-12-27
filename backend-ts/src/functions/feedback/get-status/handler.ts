/**
 * Lambda function to get user's feedback status for a location.
 *
 * GET /locations/{id}/feedback/status
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, badRequestError, internalError } from "@shared/utils/responses";
import { getUserFeedback } from "@shared/db/feedback";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import type { AuthenticatedEvent } from "@shared/types";

/**
 * Handle GET /locations/{id}/feedback/status request.
 */
export const handler = requireAuth(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const user = getUserInfo(event);
      const locationId = event.pathParameters?.id;

      if (!locationId) {
        return badRequestError("Location ID is required");
      }

      if (!user) {
        return internalError();
      }

      // Check for like feedback
      const likeFeedback = await getUserFeedback(locationId, user.id, "like");

      // Check for favorite feedback
      const favoriteFeedback = await getUserFeedback(locationId, user.id, "favorite");

      return successResponse({
        data: {
          liked: likeFeedback !== null,
          favorited: favoriteFeedback !== null,
        },
      });
    } catch (error) {
      console.error("Error getting feedback status:", error);
      return internalError();
    }
  }
);
