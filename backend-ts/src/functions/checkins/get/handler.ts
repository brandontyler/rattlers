/**
 * Lambda function to get check-ins for a location.
 *
 * GET /locations/{id}/checkins
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import {
  successResponse,
  badRequestError,
  internalError,
} from "@shared/utils/responses";
import { getCheckInsByLocation, countCheckInsForLocation } from "@shared/db/checkins";
import type { LocationCheckInSummary, CheckInResponse } from "@shared/types";

/**
 * Handle GET /locations/{id}/checkins request.
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    const locationId = event.pathParameters?.id;

    if (!locationId) {
      return badRequestError("Location ID is required");
    }

    // Parse limit from query params (default 10, max 50)
    const limitParam = event.queryStringParameters?.limit;
    let limit = 10;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 50);
      }
    }

    // Get recent check-ins
    const checkIns = await getCheckInsByLocation(locationId, limit);

    // Get total count
    const checkInCount = await countCheckInsForLocation(locationId);

    // Map to response format
    const recentCheckIns: CheckInResponse[] = checkIns.map((checkIn) => ({
      id: checkIn.id,
      locationId: checkIn.locationId,
      userId: checkIn.userId,
      username: checkIn.username,
      status: checkIn.status,
      note: checkIn.note,
      photoKey: checkIn.photoKey,
      createdAt: checkIn.createdAt,
    }));

    const summary: LocationCheckInSummary = {
      latestCheckIn: recentCheckIns.length > 0 ? recentCheckIns[0] : undefined,
      recentCheckIns,
      checkInCount,
    };

    return successResponse({
      data: summary,
    });
  } catch (error) {
    console.error("Error getting check-ins:", error);
    return internalError();
  }
};
