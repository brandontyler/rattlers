/**
 * Lambda function to get all locations with optional filtering.
 *
 * GET /locations?lat=32.7767&lng=-96.797&radius=10&search=dallas&status=active&minRating=4
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, internalError, validationError } from "@shared/utils/responses";
import { listLocations } from "@shared/db/locations";
import { listLocationsQuerySchema, parseQueryParams } from "@shared/utils/validation";
import type { Location } from "@shared/types";

/**
 * Handle GET /locations request.
 */
export async function handler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    // Parse and validate query parameters
    const parseResult = parseQueryParams(
      event.queryStringParameters,
      listLocationsQuerySchema
    );

    if (!parseResult.success) {
      return validationError(parseResult.errors);
    }

    const {
      search,
      status = "active",
      minRating = 0,
      page = 1,
      pageSize = 50,
    } = parseResult.data;

    // Get locations from database
    const allLocations = await listLocations({ status });

    // Apply filters
    let filteredLocations: Location[] = allLocations;

    // Search filter (searches address, description, AI description)
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLocations = filteredLocations.filter(
        (loc) =>
          loc.address.toLowerCase().includes(searchLower) ||
          loc.description.toLowerCase().includes(searchLower) ||
          (loc.aiDescription?.toLowerCase().includes(searchLower) ?? false)
      );
    }

    // Rating filter - using likeCount as a proxy for rating
    if (minRating > 0) {
      filteredLocations = filteredLocations.filter((loc) => loc.likeCount >= minRating);
    }

    // TODO: Implement proximity search with lat/lng/radius
    // This would require geohashing or a geospatial index

    // Pagination
    const total = filteredLocations.length;
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedLocations = filteredLocations.slice(startIdx, endIdx);

    return successResponse({
      data: paginatedLocations,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error getting locations:", error);
    return internalError();
  }
}
