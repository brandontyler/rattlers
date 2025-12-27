/**
 * Lambda function to get a single location by ID.
 *
 * GET /locations/{id}
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, notFoundError, badRequestError, internalError } from "@shared/utils/responses";
import { getLocation, incrementViewCount } from "@shared/db/locations";

/**
 * Handle GET /locations/{id} request.
 */
export async function handler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    const locationId = event.pathParameters?.id;

    if (!locationId) {
      return badRequestError("Location ID is required");
    }

    // Get location from database
    const location = await getLocation(locationId);

    if (!location) {
      return notFoundError("Location not found");
    }

    // Increment view count (fire and forget)
    incrementViewCount(locationId).catch((err) => {
      console.error("Failed to increment view count:", err);
    });

    return successResponse({ data: location });
  } catch (error) {
    console.error("Error getting location:", error);
    return internalError();
  }
}
