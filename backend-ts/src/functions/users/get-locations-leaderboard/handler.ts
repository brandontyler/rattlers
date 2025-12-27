/**
 * Lambda function to get the locations leaderboard.
 *
 * GET /locations/leaderboard
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, internalError } from "@shared/utils/responses";
import { listLocations } from "@shared/db/locations";

/**
 * Handle GET /locations/leaderboard request.
 */
export async function handler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    // Get all active locations
    const locations = await listLocations({ status: "active", limit: 500 });

    // Sort by engagement (likes + saves + views)
    const leaderboard = locations
      .map((loc) => ({
        id: loc.id,
        address: loc.address,
        description: loc.description,
        photos: loc.photos.slice(0, 1), // Just first photo for thumbnail
        likeCount: loc.likeCount,
        saveCount: loc.saveCount,
        viewCount: loc.viewCount,
        score: loc.likeCount * 3 + loc.saveCount * 2 + loc.viewCount,
        createdBy: loc.createdBy,
        createdByUsername: loc.createdByUsername,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    return successResponse({ data: leaderboard });
  } catch (error) {
    console.error("Error getting locations leaderboard:", error);
    return internalError();
  }
}
