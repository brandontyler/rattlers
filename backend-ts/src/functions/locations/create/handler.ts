/**
 * Lambda function to create a new location (admin only).
 *
 * POST /locations
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { successResponse, validationError, internalError } from "@shared/utils/responses";
import { createLocation } from "@shared/db/locations";
import { requireAdmin, getUserInfo } from "@shared/utils/auth";
import { createLocationSchema, parseJsonBody } from "@shared/utils/validation";
import type { AuthenticatedEvent, Location } from "@shared/types";

/**
 * Handle POST /locations request.
 */
export const handler = requireAdmin(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const user = getUserInfo(event);

      // Parse and validate request body
      const parseResult = parseJsonBody(event.body, createLocationSchema);

      if (!parseResult.success) {
        return validationError(parseResult.errors);
      }

      const { address, lat, lng, description = "", photos = [] } = parseResult.data;

      // Create location object
      const now = new Date().toISOString();
      const location: Location = {
        id: uuidv4(),
        address,
        lat,
        lng,
        description,
        photos,
        status: "active",
        likeCount: 0,
        reportCount: 0,
        viewCount: 0,
        saveCount: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: user?.id,
      };

      // Save to database
      await createLocation(location);

      return successResponse({
        data: location,
        message: "Location created successfully",
        statusCode: 201,
      });
    } catch (error) {
      console.error("Error creating location:", error);
      return internalError();
    }
  }
);
