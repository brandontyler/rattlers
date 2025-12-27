/**
 * Lambda function to reject a suggestion (admin only).
 *
 * POST /suggestions/{id}/reject
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import {
  successResponse,
  notFoundError,
  badRequestError,
  internalError,
} from "@shared/utils/responses";
import { getSuggestion, updateSuggestionStatus } from "@shared/db/suggestions";
import { requirePermission, getUserInfo } from "@shared/utils/auth";
import type { AuthenticatedEvent } from "@shared/types";

/**
 * Handle POST /suggestions/{id}/reject request.
 */
export const handler = requirePermission("CAN_REJECT", "Rejection permission required")(
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

      // Update suggestion status
      const now = new Date().toISOString();
      await updateSuggestionStatus(suggestionId, "rejected", user.id, now);

      return successResponse({
        message: "Suggestion rejected",
      });
    } catch (error) {
      console.error("Error rejecting suggestion:", error);
      return internalError();
    }
  }
);
