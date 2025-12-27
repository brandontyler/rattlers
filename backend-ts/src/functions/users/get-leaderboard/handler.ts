/**
 * Lambda function to get the user leaderboard.
 *
 * GET /users/leaderboard
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, internalError } from "@shared/utils/responses";
import { listLocations } from "@shared/db/locations";
import { getUserProfile } from "@shared/db/users";

interface LeaderboardEntry {
  userId: string;
  username: string | null;
  submissionCount: number;
  totalLikes: number;
  totalViews: number;
  score: number;
}

/**
 * Handle GET /users/leaderboard request.
 */
export async function handler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    // Get all active locations
    const locations = await listLocations({ status: "active", limit: 500 });

    // Aggregate stats by creator
    const userStatsMap = new Map<
      string,
      { submissionCount: number; totalLikes: number; totalViews: number }
    >();

    for (const location of locations) {
      if (!location.createdBy) continue;

      const existing = userStatsMap.get(location.createdBy);

      if (existing) {
        existing.submissionCount += 1;
        existing.totalLikes += location.likeCount;
        existing.totalViews += location.viewCount;
      } else {
        userStatsMap.set(location.createdBy, {
          submissionCount: 1,
          totalLikes: location.likeCount,
          totalViews: location.viewCount,
        });
      }
    }

    // Build leaderboard with usernames
    const leaderboardPromises = Array.from(userStatsMap.entries()).map(
      async ([userId, stats]) => {
        const profile = await getUserProfile(userId);
        return {
          userId,
          username: profile?.username ?? null,
          ...stats,
          score: stats.submissionCount * 10 + stats.totalLikes * 5 + stats.totalViews,
        };
      }
    );

    const leaderboard = await Promise.all(leaderboardPromises);

    // Sort by score and take top 50
    leaderboard.sort((a, b) => b.score - a.score);
    const topLeaderboard = leaderboard.slice(0, 50);

    return successResponse({ data: topLeaderboard });
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    return internalError();
  }
}
