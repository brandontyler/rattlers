/**
 * Lambda function to get a user's profile.
 *
 * GET /users/profile
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, notFoundError, internalError } from "@shared/utils/responses";
import { getUserProfile } from "@shared/db/users";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import type { AuthenticatedEvent } from "@shared/types";

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
      const profile = await getUserProfile(user.id);

      if (!profile) {
        return notFoundError("User not found");
      }

      return successResponse({ data: profile });
    } catch (error) {
      console.error("Error getting user profile:", error);
      return internalError();
    }
  }
);
