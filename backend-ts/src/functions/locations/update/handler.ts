/**
 * Lambda function to update a location (admin only).
 *
 * PUT /locations/{id}
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import {
  successResponse,
  notFoundError,
  badRequestError,
  validationError,
  internalError,
} from "@shared/utils/responses";
import { getLocation, updateLocation } from "@shared/db/locations";
import { requireEditPermission } from "@shared/utils/auth";
import { updateLocationSchema, parseJsonBody } from "@shared/utils/validation";
import type { AuthenticatedEvent } from "@shared/types";

/**
 * Handle PUT /locations/{id} request.
 */
export const handler = requireEditPermission(
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

      // Parse and validate request body
      const parseResult = parseJsonBody(event.body, updateLocationSchema);

      if (!parseResult.success) {
        return validationError(parseResult.errors);
      }

      const updates = parseResult.data;

      // Add updatedAt timestamp
      const updatedLocation = await updateLocation(locationId, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      return successResponse({
        data: updatedLocation,
        message: "Location updated successfully",
      });
    } catch (error) {
      console.error("Error updating location:", error);
      return internalError();
    }
  }
);
