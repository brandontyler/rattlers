/**
 * Lambda function to get a user's profile.
 *
 * GET /users/profile
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { CognitoIdentityProviderClient, AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { successResponse, internalError } from "@shared/utils/responses";
import { getUserProfile } from "@shared/db/users";
import { getSuggestionsByUser } from "@shared/db/suggestions";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import type { AuthenticatedEvent } from "@shared/types";

const cognitoClient = new CognitoIdentityProviderClient({});

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

      // Get username from users table (optional - don't fail if not found)
      let username: string | undefined;
      try {
        const profile = await getUserProfile(user.id);
        username = profile?.username;
      } catch (err) {
        console.warn("Could not fetch username from users table:", err);
      }

      // Get user creation date from Cognito
      let joinDate = new Date().toISOString();
      const userPoolId = process.env.USER_POOL_ID;

      if (userPoolId) {
        try {
          const cognitoResponse = await cognitoClient.send(
            new AdminGetUserCommand({
              UserPoolId: userPoolId,
              Username: user.id,
            })
          );
          if (cognitoResponse.UserCreateDate) {
            joinDate = cognitoResponse.UserCreateDate.toISOString();
          }
        } catch (err) {
          console.warn("Could not fetch user creation date from Cognito:", err);
        }
      }

      // Get user's submissions to compute stats
      let stats = {
        totalSubmissions: 0,
        approvedSubmissions: 0,
        pendingSubmissions: 0,
        rejectedSubmissions: 0,
      };

      try {
        const submissions = await getSuggestionsByUser(user.id);
        stats = {
          totalSubmissions: submissions.length,
          approvedSubmissions: submissions.filter((s) => s.status === "approved").length,
          pendingSubmissions: submissions.filter((s) => s.status === "pending").length,
          rejectedSubmissions: submissions.filter((s) => s.status === "rejected").length,
        };
      } catch (err) {
        console.warn("Could not fetch submissions:", err);
      }

      // Build profile response (matching Python backend behavior)
      const response = {
        id: user.id,
        email: user.email,
        username,
        isAdmin: user.isAdmin,
        joinDate,
        stats,
      };

      return successResponse({ data: response });
    } catch (error) {
      console.error("Error getting user profile:", error);
      return internalError();
    }
  }
);
