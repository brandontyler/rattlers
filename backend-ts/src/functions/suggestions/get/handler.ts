/**
 * Lambda function to get all pending suggestions (admin only).
 *
 * GET /suggestions
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, badRequestError, internalError } from "@shared/utils/responses";
import { listSuggestionsByStatus } from "@shared/db/suggestions";
import { requireAdminView } from "@shared/utils/auth";
import type { AuthenticatedEvent } from "@shared/types";

const VALID_STATUSES = ["pending", "approved", "rejected"] as const;
type SuggestionStatus = (typeof VALID_STATUSES)[number];

/**
 * Handle GET /suggestions request.
 */
export const handler = requireAdminView(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const status = event.queryStringParameters?.status ?? "pending";

      // Security: Validate status - return error instead of silently defaulting
      if (!VALID_STATUSES.includes(status as SuggestionStatus)) {
        return badRequestError(
          `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`
        );
      }

      // Get suggestions by status
      const suggestions = await listSuggestionsByStatus(status as SuggestionStatus);

      return successResponse({ data: suggestions });
    } catch (error) {
      console.error("Error getting suggestions:", error);
      return internalError();
    }
  }
);
