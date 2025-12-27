/**
 * Lambda function to update a route.
 *
 * PUT /routes/{id}
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import {
  successResponse,
  notFoundError,
  badRequestError,
  forbiddenError,
  validationError,
  internalError,
} from "@shared/utils/responses";
import { getRoute, updateRoute } from "@shared/db/routes";
import { getLocation } from "@shared/db/locations";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import { updateRouteSchema, parseJsonBody } from "@shared/utils/validation";
import type { AuthenticatedEvent, Location } from "@shared/types";

/**
 * Calculate distance between two coordinates in miles.
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Recalculate route stats if locations changed.
 */
async function recalculateStats(locationIds: string[]): Promise<{
  stopCount: number;
  estimatedMinutes: number;
  totalMiles: number;
}> {
  const locationPromises = locationIds.map((id) => getLocation(id));
  const locationResults = await Promise.all(locationPromises);
  const locations = locationResults.filter((loc): loc is Location => loc !== null);

  const stopCount = locations.length;
  const viewingTime = stopCount * 10;

  let totalMiles = 0;
  for (let i = 0; i < locations.length - 1; i++) {
    const loc1 = locations[i];
    const loc2 = locations[i + 1];
    if (loc1 && loc2) {
      totalMiles += calculateDistance(loc1.lat, loc1.lng, loc2.lat, loc2.lng);
    }
  }

  const drivingTime = Math.round(totalMiles * 2);

  return {
    stopCount,
    estimatedMinutes: viewingTime + drivingTime,
    totalMiles: Math.round(totalMiles * 10) / 10,
  };
}

/**
 * Handle PUT /routes/{id} request.
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
        return forbiddenError("You can only update your own routes");
      }

      // Parse and validate request body
      const parseResult = parseJsonBody(event.body, updateRouteSchema);

      if (!parseResult.success) {
        return validationError(parseResult.errors);
      }

      const updates = parseResult.data;

      // If locations changed, recalculate stats
      let statsUpdates = {};
      if (updates.locationIds) {
        statsUpdates = await recalculateStats(updates.locationIds);
      }

      // Update status based on isPublic
      let statusUpdate = {};
      if (updates.isPublic !== undefined) {
        statusUpdate = { status: updates.isPublic ? "active" : "draft" };
      }

      // Update route
      const updatedRoute = await updateRoute(routeId, {
        ...updates,
        ...statsUpdates,
        ...statusUpdate,
        updatedAt: new Date().toISOString(),
      });

      return successResponse({
        data: updatedRoute,
        message: "Route updated successfully",
      });
    } catch (error) {
      console.error("Error updating route:", error);
      return internalError();
    }
  }
);
