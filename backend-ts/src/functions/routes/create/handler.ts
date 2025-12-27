/**
 * Lambda function to create a new route.
 *
 * POST /routes
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { successResponse, validationError, internalError } from "@shared/utils/responses";
import { createRoute } from "@shared/db/routes";
import { getLocation } from "@shared/db/locations";
import { getUsername } from "@shared/db/users";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import { createRouteSchema, parseJsonBody } from "@shared/utils/validation";
import type { AuthenticatedEvent, Route, Location } from "@shared/types";

/**
 * Calculate distance between two coordinates in miles using Haversine formula.
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate route statistics based on locations.
 */
function calculateRouteStats(locations: Location[]): {
  stopCount: number;
  estimatedMinutes: number;
  totalMiles: number;
} {
  if (locations.length === 0) {
    return { stopCount: 0, estimatedMinutes: 0, totalMiles: 0 };
  }

  const stopCount = locations.length;

  // Estimate 10 minutes per stop viewing time
  const viewingTime = stopCount * 10;

  // Calculate driving distance
  let totalMiles = 0;
  for (let i = 0; i < locations.length - 1; i++) {
    const loc1 = locations[i];
    const loc2 = locations[i + 1];
    if (loc1 && loc2) {
      totalMiles += calculateDistance(loc1.lat, loc1.lng, loc2.lat, loc2.lng);
    }
  }

  // Estimate 2 minutes per mile for driving
  const drivingTime = Math.round(totalMiles * 2);
  const estimatedMinutes = viewingTime + drivingTime;

  return {
    stopCount,
    estimatedMinutes,
    totalMiles: Math.round(totalMiles * 10) / 10,
  };
}

/**
 * Handle POST /routes request.
 */
export const handler = requireAuth(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const user = getUserInfo(event);

      if (!user) {
        return internalError();
      }

      // Parse and validate request body
      const parseResult = parseJsonBody(event.body, createRouteSchema);

      if (!parseResult.success) {
        return validationError(parseResult.errors);
      }

      const {
        title,
        description = "",
        locationIds,
        tags = [],
        isPublic = true,
      } = parseResult.data;

      // Fetch locations to calculate stats
      const locationPromises = locationIds.map((id) => getLocation(id));
      const locationResults = await Promise.all(locationPromises);
      const locations = locationResults.filter((loc): loc is Location => loc !== null);

      // Calculate route stats
      const stats = calculateRouteStats(locations);

      // Get username
      const username = await getUsername(user.id);

      // Create route object
      const now = new Date().toISOString();
      const route: Route = {
        id: uuidv4(),
        title,
        description,
        locationIds,
        tags,
        createdBy: user.id,
        createdByUsername: username ?? undefined,
        createdAt: now,
        updatedAt: now,
        status: isPublic ? "active" : "draft",
        isPublic,
        likeCount: 0,
        saveCount: 0,
        startCount: 0,
        ...stats,
      };

      // Save to database
      await createRoute(route);

      return successResponse({
        data: route,
        message: "Route created successfully!",
        statusCode: 201,
      });
    } catch (error) {
      console.error("Error creating route:", error);
      return internalError();
    }
  }
);
