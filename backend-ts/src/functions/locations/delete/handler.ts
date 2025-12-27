/**
 * Lambda function to delete a location (admin only).
 *
 * DELETE /locations/{id}
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import {
  successResponse,
  notFoundError,
  badRequestError,
  internalError,
} from "@shared/utils/responses";
import { getLocation, deleteLocation } from "@shared/db/locations";
import { requireAdmin } from "@shared/utils/auth";
import type { AuthenticatedEvent } from "@shared/types";

/**
 * Handle DELETE /locations/{id} request.
 */
export const handler = requireAdmin(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const locationId = event.pathParameters?.id;

      if (!locationId) {
        return badRequestError("Location ID is required");
      }

      // Check if location exists
      const existing = await getLocation(locationId);
      if (!existing) {
        return notFoundError("Location not found");
      }

      // Soft delete the location
      await deleteLocation(locationId);

      return successResponse({
        message: "Location deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting location:", error);
      return internalError();
    }
  }
);
