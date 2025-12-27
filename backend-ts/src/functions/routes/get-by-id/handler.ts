/**
 * Lambda function to get a single route by ID.
 *
 * GET /routes/{id}
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, notFoundError, badRequestError, internalError } from "@shared/utils/responses";
import { getRoute, incrementRouteStartCount } from "@shared/db/routes";
import { getLocation } from "@shared/db/locations";
import type { Location } from "@shared/types";

/**
 * Handle GET /routes/{id} request.
 */
export async function handler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    const routeId = event.pathParameters?.id;

    if (!routeId) {
      return badRequestError("Route ID is required");
    }

    // Get route from database
    const route = await getRoute(routeId);

    if (!route) {
      return notFoundError("Route not found");
    }

    // Increment start count (fire and forget)
    incrementRouteStartCount(routeId).catch((err) => {
      console.error("Failed to increment start count:", err);
    });

    // Fetch location details for each stop
    const locationPromises = route.locationIds.map((id) => getLocation(id));
    const locationResults = await Promise.all(locationPromises);

    // Filter out null results (deleted locations)
    const locations: Location[] = locationResults.filter(
      (loc): loc is Location => loc !== null
    );

    return successResponse({
      data: {
        ...route,
        locations,
      },
    });
  } catch (error) {
    console.error("Error getting route:", error);
    return internalError();
  }
}
