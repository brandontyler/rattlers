/**
 * Lambda function to toggle favorite on a location.
 *
 * POST /locations/{id}/favorite
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  successResponse,
  notFoundError,
  badRequestError,
  internalError,
} from "@shared/utils/responses";
import { getLocation, incrementSaveCount, decrementSaveCount } from "@shared/db/locations";
import { getUserFeedback, createFeedbackAtomic, deleteFeedback } from "@shared/db/feedback";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import type { AuthenticatedEvent, Feedback } from "@shared/types";

/**
 * Handle POST /locations/{id}/favorite request.
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

      // Check if location exists
      const location = await getLocation(locationId);
      if (!location) {
        return notFoundError("Location not found");
      }

      // Check if user already favorited this location
      const existingFeedback = await getUserFeedback(locationId, user.id, "favorite");

      if (existingFeedback) {
        // Remove the favorite (toggle off)
        await deleteFeedback(existingFeedback.id, locationId);
        await decrementSaveCount(locationId);

        return successResponse({
          data: { action: "removed", favorited: false },
          message: "Removed from favorites",
        });
      }

      // Create new favorite
      const feedback: Feedback = {
        id: uuidv4(),
        locationId,
        userId: user.id,
        type: "favorite",
        createdAt: new Date().toISOString(),
      };

      const result = await createFeedbackAtomic(feedback);

      if (!result.success) {
        return successResponse({
          data: { action: "already_exists", favorited: true },
          message: "Already favorited",
        });
      }

      await incrementSaveCount(locationId);

      return successResponse({
        data: { action: "added", favorited: true },
        message: "Added to favorites!",
        statusCode: 201,
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
      return internalError();
    }
  }
);
