/**
 * Lambda function to approve a suggestion (admin only).
 *
 * POST /suggestions/{id}/approve
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  successResponse,
  notFoundError,
  badRequestError,
  internalError,
} from "@shared/utils/responses";
import { getSuggestion, updateSuggestionStatus } from "@shared/db/suggestions";
import { createLocation } from "@shared/db/locations";
import { requireApprovalPermission, getUserInfo } from "@shared/utils/auth";
import type { AuthenticatedEvent, Location } from "@shared/types";

/**
 * Handle POST /suggestions/{id}/approve request.
 */
export const handler = requireApprovalPermission(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const user = getUserInfo(event);
      const suggestionId = event.pathParameters?.id;

      if (!suggestionId) {
        return badRequestError("Suggestion ID is required");
      }

      if (!user) {
        return internalError();
      }

      // Get the suggestion
      const suggestion = await getSuggestion(suggestionId);
      if (!suggestion) {
        return notFoundError("Suggestion not found");
      }

      if (suggestion.status !== "pending") {
        return badRequestError(`Suggestion has already been ${suggestion.status}`);
      }

      // Create a new location from the suggestion
      const now = new Date().toISOString();
      const location: Location = {
        id: uuidv4(),
        address: suggestion.address,
        lat: suggestion.lat ?? 0, // Should have been geocoded
        lng: suggestion.lng ?? 0,
        description: suggestion.description,
        photos: suggestion.photos,
        status: "active",
        likeCount: 0,
        reportCount: 0,
        viewCount: 0,
        saveCount: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: suggestion.submittedBy,
        createdByUsername: suggestion.submittedByUsername,
      };

      await createLocation(location);

      // Update suggestion status
      await updateSuggestionStatus(suggestionId, "approved", user.id, now);

      return successResponse({
        data: { suggestion, location },
        message: "Suggestion approved and location created!",
      });
    } catch (error) {
      console.error("Error approving suggestion:", error);
      return internalError();
    }
  }
);
