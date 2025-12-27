/**
 * Lambda function to update a user's profile.
 *
 * PUT /users/me/profile
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import {
  successResponse,
  validationError,
  badRequestError,
  internalError,
} from "@shared/utils/responses";
import { updateUserProfile, isUsernameTaken } from "@shared/db/users";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import { updateProfileSchema, parseJsonBody } from "@shared/utils/validation";
import type { AuthenticatedEvent } from "@shared/types";

/**
 * Handle PUT /users/me/profile request.
 */
export const handler = requireAuth(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const user = getUserInfo(event);

      if (!user) {
        return internalError();
      }

      // Parse and validate request body
      const parseResult = parseJsonBody(event.body, updateProfileSchema);

      if (!parseResult.success) {
        return validationError(parseResult.errors);
      }

      const { username, name } = parseResult.data;

      // Check if username is taken (if being updated)
      if (username) {
        const taken = await isUsernameTaken(username, user.id);
        if (taken) {
          return badRequestError("Username is already taken");
        }
      }

      // Update profile
      const updated = await updateUserProfile(user.id, {
        ...(username && { username }),
        ...(name && { name }),
        updatedAt: new Date().toISOString(),
      });

      return successResponse({
        data: updated,
        message: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      return internalError();
    }
  }
);
