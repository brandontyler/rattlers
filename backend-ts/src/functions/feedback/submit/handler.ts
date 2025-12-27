/**
 * Lambda function to submit feedback (like) on a location.
 *
 * POST /locations/{id}/feedback
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  successResponse,
  notFoundError,
  badRequestError,
  internalError,
} from "@shared/utils/responses";
import { getLocation, incrementLikeCount, decrementLikeCount } from "@shared/db/locations";
import { getUserFeedback, createFeedbackAtomic, deleteFeedback } from "@shared/db/feedback";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import type { AuthenticatedEvent, Feedback } from "@shared/types";

/**
 * Handle POST /locations/{id}/feedback request.
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

      // Check if user already liked this location
      const existingFeedback = await getUserFeedback(locationId, user.id, "like");

      if (existingFeedback) {
        // Remove the like (toggle off)
        await deleteFeedback(existingFeedback.id, locationId);
        await decrementLikeCount(locationId);

        return successResponse({
          data: { action: "removed", liked: false },
          message: "Like removed",
        });
      }

      // Create new like
      const feedback: Feedback = {
        id: uuidv4(),
        locationId,
        userId: user.id,
        type: "like",
        createdAt: new Date().toISOString(),
      };

      const result = await createFeedbackAtomic(feedback);

      if (!result.success) {
        // Feedback already exists (race condition)
        return successResponse({
          data: { action: "already_exists", liked: true },
          message: "Already liked",
        });
      }

      await incrementLikeCount(locationId);

      return successResponse({
        data: { action: "added", liked: true },
        message: "Location liked!",
        statusCode: 201,
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      return internalError();
    }
  }
);
