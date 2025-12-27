/**
 * Lambda function to delete a route.
 *
 * DELETE /routes/{id}
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import {
  successResponse,
  notFoundError,
  badRequestError,
  forbiddenError,
  internalError,
} from "@shared/utils/responses";
import { getRoute, deleteRoute } from "@shared/db/routes";
import { deleteAllRouteFeedback } from "@shared/db/route-feedback";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import type { AuthenticatedEvent } from "@shared/types";

/**
 * Handle DELETE /routes/{id} request.
 */
export const handler = requireAuth(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const user = getUserInfo(event);
      const routeId = event.pathParameters?.id;

      if (!routeId) {
        return badRequestError("Route ID is required");
      }

      // Check if route exists
      const existing = await getRoute(routeId);
      if (!existing) {
        return notFoundError("Route not found");
      }

      // Check ownership (or admin)
      if (existing.createdBy !== user?.id && !user?.isAdmin) {
        return forbiddenError("You can only delete your own routes");
      }

      // Delete all feedback for this route
      await deleteAllRouteFeedback(routeId);

      // Delete the route
      await deleteRoute(routeId);

      return successResponse({
        message: "Route deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting route:", error);
      return internalError();
    }
  }
);
