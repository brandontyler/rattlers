/**
 * Lambda function to submit feedback (like/save) on a route.
 *
 * POST /routes/{id}/feedback
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  successResponse,
  notFoundError,
  badRequestError,
  validationError,
  internalError,
} from "@shared/utils/responses";
import { getRoute, incrementRouteLikeCount, decrementRouteLikeCount, incrementRouteSaveCount, decrementRouteSaveCount } from "@shared/db/routes";
import {
  getUserRouteFeedback,
  createRouteFeedbackAtomic,
  deleteRouteFeedback,
} from "@shared/db/route-feedback";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import type { AuthenticatedEvent, RouteFeedback } from "@shared/types";
import { z } from "zod";
import { parseJsonBody } from "@shared/utils/validation";

const routeFeedbackSchema = z.object({
  type: z.enum(["like", "save"]),
});

/**
 * Handle POST /routes/{id}/feedback request.
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

      // Check if route exists
      const route = await getRoute(routeId);
      if (!route) {
        return notFoundError("Route not found");
      }

      // Parse request body
      const parseResult = parseJsonBody(event.body, routeFeedbackSchema);

      if (!parseResult.success) {
        return validationError(parseResult.errors);
      }

      const { type } = parseResult.data;

      // Check if user already has this feedback
      const existingFeedback = await getUserRouteFeedback(routeId, user.id, type);

      if (existingFeedback) {
        // Remove the feedback (toggle off)
        await deleteRouteFeedback(existingFeedback.id, routeId);

        // Decrement count
        if (type === "like") {
          await decrementRouteLikeCount(routeId);
        } else {
          await decrementRouteSaveCount(routeId);
        }

        return successResponse({
          data: { action: "removed", type },
          message: `${type === "like" ? "Like" : "Save"} removed`,
        });
      }

      // Create new feedback
      const feedback: RouteFeedback = {
        id: uuidv4(),
        routeId,
        userId: user.id,
        type,
        createdAt: new Date().toISOString(),
      };

      const result = await createRouteFeedbackAtomic(feedback);

      if (!result.success) {
        // Feedback already exists (race condition)
        return successResponse({
          data: { action: "already_exists", type },
          message: `Already ${type === "like" ? "liked" : "saved"}`,
        });
      }

      // Increment count
      if (type === "like") {
        await incrementRouteLikeCount(routeId);
      } else {
        await incrementRouteSaveCount(routeId);
      }

      return successResponse({
        data: { action: "added", type },
        message: `Route ${type === "like" ? "liked" : "saved"}!`,
        statusCode: 201,
      });
    } catch (error) {
      console.error("Error submitting route feedback:", error);
      return internalError();
    }
  }
);
