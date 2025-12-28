/**
 * Lambda function to get a user's profile.
 *
 * GET /users/profile
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, internalError } from "@shared/utils/responses";
import { getUserProfile, upsertUserProfile } from "@shared/db/users";
import { getSuggestionsByUser } from "@shared/db/suggestions";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import type { AuthenticatedEvent, UserProfile } from "@shared/types";

/**
 * Handle GET /users/profile request.
 */
export const handler = requireAuth(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const user = getUserInfo(event);

      if (!user) {
        return internalError();
      }

      // Get user profile
      let profile = await getUserProfile(user.id);

      // If profile doesn't exist, create one (handles cases where post-auth trigger failed)
      if (!profile) {
        const newProfile: UserProfile = {
          userId: user.id,
          email: user.email ?? "",
          isAdmin: user.isAdmin,
          createdAt: new Date().toISOString(),
        };
        profile = await upsertUserProfile(newProfile);
      }

      // Get user's submissions to compute stats
      const submissions = await getSuggestionsByUser(user.id);

      const stats = {
        totalSubmissions: submissions.length,
        approvedSubmissions: submissions.filter((s) => s.status === "approved").length,
        pendingSubmissions: submissions.filter((s) => s.status === "pending").length,
        rejectedSubmissions: submissions.filter((s) => s.status === "rejected").length,
      };

      // Transform to frontend expected format
      const response = {
        id: profile.userId,
        email: profile.email,
        username: profile.username,
        name: profile.name,
        isAdmin: profile.isAdmin,
        joinDate: profile.createdAt,
        stats,
      };

      return successResponse({ data: response });
    } catch (error) {
      console.error("Error getting user profile:", error);
      return internalError();
    }
  }
);
