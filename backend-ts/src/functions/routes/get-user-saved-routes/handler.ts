/**
 * Lambda function to get routes saved by a user.
 *
 * GET /users/{userId}/saved-routes
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, badRequestError, forbiddenError, internalError } from "@shared/utils/responses";
import { getUserSavedRouteIds } from "@shared/db/route-feedback";
import { getRoute } from "@shared/db/routes";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import type { AuthenticatedEvent, Route } from "@shared/types";

/**
 * Handle GET /users/{userId}/saved-routes request.
 */
export const handler = requireAuth(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const user = getUserInfo(event);
      const userId = event.pathParameters?.userId;

      if (!userId) {
        return badRequestError("User ID is required");
      }

      // Users can only view their own saved routes (unless admin)
      if (userId !== user?.id && !user?.isAdmin) {
        return forbiddenError("You can only view your own saved routes");
      }

      // Get saved route IDs
      const savedRouteIds = await getUserSavedRouteIds(userId);

      // Fetch route details
      const routePromises = savedRouteIds.map((id) => getRoute(id));
      const routeResults = await Promise.all(routePromises);

      // Filter out null results (deleted routes)
      const routes: Route[] = routeResults.filter((route): route is Route => route !== null);

      return successResponse({ data: routes });
    } catch (error) {
      console.error("Error getting user saved routes:", error);
      return internalError();
    }
  }
);
