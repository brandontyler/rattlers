/**
 * Lambda function to get route creators leaderboard.
 *
 * GET /routes/leaderboard
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, internalError } from "@shared/utils/responses";
import { listPublicRoutes } from "@shared/db/routes";

interface CreatorStats {
  // Note: userId intentionally excluded from public response for privacy
  username: string | null;
  routeCount: number;
  totalLikes: number;
  totalSaves: number;
  totalStarts: number;
}

/**
 * Handle GET /routes/leaderboard request.
 */
export async function handler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    // Get all public routes
    const routes = await listPublicRoutes({ sortBy: "popular", limit: 500 });

    // Aggregate stats by creator
    const creatorStatsMap = new Map<string, CreatorStats>();

    for (const route of routes) {
      const existing = creatorStatsMap.get(route.createdBy);

      if (existing) {
        existing.routeCount += 1;
        existing.totalLikes += route.likeCount;
        existing.totalSaves += route.saveCount;
        existing.totalStarts += route.startCount;
      } else {
        // Security: Don't expose userId in public leaderboard response
        creatorStatsMap.set(route.createdBy, {
          username: route.createdByUsername ?? null,
          routeCount: 1,
          totalLikes: route.likeCount,
          totalSaves: route.saveCount,
          totalStarts: route.startCount,
        });
      }
    }

    // Convert to array and sort by total engagement
    const leaderboard = Array.from(creatorStatsMap.values())
      .map((stats) => ({
        ...stats,
        score: stats.totalLikes * 3 + stats.totalSaves * 2 + stats.totalStarts,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    return successResponse({ data: leaderboard });
  } catch (error) {
    console.error("Error getting routes leaderboard:", error);
    return internalError();
  }
}
