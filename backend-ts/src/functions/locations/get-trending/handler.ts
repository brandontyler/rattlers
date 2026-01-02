/**
 * Lambda function to get trending locations based on recent activity.
 *
 * GET /locations/trending?limit=10&days=7
 *
 * Calculates a "trending score" based on recent check-ins with weights:
 * - amazing: 3.0 (most valuable - indicates exceptional experience)
 * - on: 2.0 (confirms lights are active)
 * - changed: 1.0 (still indicates activity)
 * - off: 0.5 (least valuable but still engagement)
 *
 * Scores decay exponentially based on recency (half-life ~3.5 days).
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, internalError } from "@shared/utils/responses";
import { getRecentCheckIns } from "@shared/db/checkins";
import { getLocationsByIds } from "@shared/db/locations";
import type { Location, CheckIn, CheckInStatus } from "@shared/types";

/**
 * Weights for different check-in statuses.
 * Higher weight = more valuable for trending.
 */
const STATUS_WEIGHTS: Record<CheckInStatus, number> = {
  amazing: 3.0,
  on: 2.0,
  changed: 1.0,
  off: 0.5,
};

/**
 * Decay constant for exponential decay.
 * ~0.2 gives a half-life of about 3.5 days.
 */
const DECAY_CONSTANT = 0.2;

/**
 * Location with trending score.
 */
export interface TrendingLocation extends Location {
  trendingScore: number;
  recentCheckInCount: number;
  latestCheckInStatus?: CheckInStatus;
  latestCheckInAt?: string;
}

/**
 * Calculate the trending score for a set of check-ins.
 */
function calculateTrendingScore(checkIns: CheckIn[], now: Date): number {
  let score = 0;

  for (const checkIn of checkIns) {
    const checkInDate = new Date(checkIn.createdAt);
    const daysAgo = (now.getTime() - checkInDate.getTime()) / (24 * 60 * 60 * 1000);

    // Apply exponential decay
    const decayFactor = Math.exp(-DECAY_CONSTANT * daysAgo);

    // Get weight for this status
    const statusWeight = STATUS_WEIGHTS[checkIn.status] || 1.0;

    score += statusWeight * decayFactor;
  }

  return score;
}

/**
 * Handle GET /locations/trending request.
 */
export async function handler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    // Parse query parameters
    const limitParam = event.queryStringParameters?.limit;
    const daysParam = event.queryStringParameters?.days;

    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 10;
    const days = daysParam ? Math.min(parseInt(daysParam, 10), 30) : 7;

    if (isNaN(limit) || limit < 1) {
      return successResponse({ data: [], message: "Invalid limit parameter" });
    }

    if (isNaN(days) || days < 1) {
      return successResponse({ data: [], message: "Invalid days parameter" });
    }

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get all recent check-ins across all locations
    const recentCheckIns = await getRecentCheckIns(cutoffDate.toISOString());

    // If no recent check-ins, return empty array
    if (recentCheckIns.length === 0) {
      return successResponse({
        data: [],
        meta: {
          days,
          limit,
          totalCheckIns: 0,
        },
      });
    }

    // Group check-ins by locationId
    const checkInsByLocation = new Map<string, CheckIn[]>();
    for (const checkIn of recentCheckIns) {
      const existing = checkInsByLocation.get(checkIn.locationId) || [];
      existing.push(checkIn);
      checkInsByLocation.set(checkIn.locationId, existing);
    }

    // Calculate trending scores for each location
    const locationScores = new Map<string, { score: number; checkIns: CheckIn[] }>();
    for (const [locationId, checkIns] of checkInsByLocation) {
      const score = calculateTrendingScore(checkIns, now);
      locationScores.set(locationId, { score, checkIns });
    }

    // Get the location IDs sorted by score
    const sortedLocationIds = Array.from(locationScores.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, limit)
      .map(([id]) => id);

    // First principles optimization: Only fetch the specific locations we need.
    // Before: listLocations() fetched ALL 147+ locations, then filtered.
    // After: getLocationsByIds() fetches only the ~10 locations with check-ins.
    // This is O(limit) instead of O(total_locations).
    const locationsMap = await getLocationsByIds(sortedLocationIds);

    // Build trending locations array
    const trendingLocations: TrendingLocation[] = [];
    for (const locationId of sortedLocationIds) {
      const location = locationsMap.get(locationId);
      const scoreData = locationScores.get(locationId);

      // Only include active locations (skip inactive/deleted)
      if (location && location.status === "active" && scoreData) {
        // Sort check-ins by date to get latest
        const sortedCheckIns = scoreData.checkIns.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const latestCheckIn = sortedCheckIns[0];

        trendingLocations.push({
          ...location,
          trendingScore: Math.round(scoreData.score * 100) / 100,
          recentCheckInCount: scoreData.checkIns.length,
          latestCheckInStatus: latestCheckIn?.status,
          latestCheckInAt: latestCheckIn?.createdAt,
        });
      }
    }

    return successResponse({
      data: trendingLocations,
      meta: {
        days,
        limit,
        totalCheckIns: recentCheckIns.length,
        locationsWithActivity: checkInsByLocation.size,
      },
    });
  } catch (error) {
    console.error("Error getting trending locations:", error);
    return internalError();
  }
}
