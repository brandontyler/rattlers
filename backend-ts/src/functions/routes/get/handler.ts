/**
 * Lambda function to get all public routes.
 *
 * GET /routes?sortBy=popular&limit=50
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, internalError } from "@shared/utils/responses";
import { listPublicRoutes } from "@shared/db/routes";
import { listRoutesQuerySchema, parseQueryParams } from "@shared/utils/validation";

/**
 * Handle GET /routes request.
 */
export async function handler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    // Parse and validate query parameters
    const parseResult = parseQueryParams(event.queryStringParameters, listRoutesQuerySchema);

    if (!parseResult.success) {
      // Use defaults if parsing fails
      const routes = await listPublicRoutes({ sortBy: "popular", limit: 50 });
      return successResponse({ data: routes });
    }

    const { sortBy, limit } = parseResult.data;

    // Get routes from database
    const routes = await listPublicRoutes({ sortBy, limit });

    return successResponse({ data: routes });
  } catch (error) {
    console.error("Error getting routes:", error);
    return internalError();
  }
}
