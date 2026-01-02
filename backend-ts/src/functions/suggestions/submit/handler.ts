/**
 * Lambda function to submit a new location suggestion.
 *
 * POST /suggestions
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { successResponse, validationError, internalError } from "@shared/utils/responses";
import { createSuggestion } from "@shared/db/suggestions";
import { getUsername } from "@shared/db/users";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import { submitSuggestionSchema, parseJsonBody } from "@shared/utils/validation";
import type { AuthenticatedEvent, Suggestion } from "@shared/types";

/**
 * Handle POST /suggestions request.
 */
export const handler = requireAuth(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const user = getUserInfo(event);

      if (!user) {
        return internalError();
      }

      // Parse and validate request body
      const parseResult = parseJsonBody(event.body, submitSuggestionSchema);

      if (!parseResult.success) {
        return validationError(parseResult.errors);
      }

      const { address, description = "", photos = [], lat, lng } = parseResult.data;

      // Get username
      const username = await getUsername(user.id);

      // Create suggestion object
      const suggestion: Suggestion = {
        id: uuidv4(),
        address,
        lat,
        lng,
        description,
        photos,
        status: "pending",
        submittedBy: user.id,
        submittedByEmail: user.email,
        submittedByUsername: username ?? undefined,
        createdAt: new Date().toISOString(),
        flaggedForReview: false,
      };

      // Save to database
      await createSuggestion(suggestion);

      // Security: Don't expose email in response - return only safe fields
      const safeResponse = {
        id: suggestion.id,
        address: suggestion.address,
        description: suggestion.description,
        status: suggestion.status,
        createdAt: suggestion.createdAt,
      };

      return successResponse({
        data: safeResponse,
        message: "Thank you for your submission! It will be reviewed shortly.",
        statusCode: 201,
      });
    } catch (error) {
      console.error("Error submitting suggestion:", error);
      return internalError();
    }
  }
);
