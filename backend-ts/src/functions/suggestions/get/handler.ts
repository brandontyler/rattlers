/**
 * Lambda function to get all pending suggestions (admin only).
 *
 * GET /suggestions
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, internalError } from "@shared/utils/responses";
import { listSuggestionsByStatus } from "@shared/db/suggestions";
import { requireAdminView } from "@shared/utils/auth";
import type { AuthenticatedEvent } from "@shared/types";

/**
 * Handle GET /suggestions request.
 */
export const handler = requireAdminView(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const status = event.queryStringParameters?.status ?? "pending";

      // Validate status
      if (!["pending", "approved", "rejected"].includes(status)) {
        const suggestions = await listSuggestionsByStatus("pending");
        return successResponse({ data: suggestions });
      }

      // Get suggestions by status
      const suggestions = await listSuggestionsByStatus(
        status as "pending" | "approved" | "rejected"
      );

      return successResponse({ data: suggestions });
    } catch (error) {
      console.error("Error getting suggestions:", error);
      return internalError();
    }
  }
);
