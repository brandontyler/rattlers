/**
 * Lambda function to submit a check-in for a location.
 *
 * POST /locations/{id}/checkins
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  successResponse,
  notFoundError,
  badRequestError,
  validationError,
  internalError,
} from "@shared/utils/responses";
import { getLocation } from "@shared/db/locations";
import { createCheckIn } from "@shared/db/checkins";
import { getUsername } from "@shared/db/users";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import { submitCheckInSchema, parseJsonBody } from "@shared/utils/validation";
import type { AuthenticatedEvent, CheckIn } from "@shared/types";

/**
 * Handle POST /locations/{id}/checkins request.
 */
export const handler = requireAuth(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const user = getUserInfo(event);
      const locationId = event.pathParameters?.id;

      if (!locationId) {
        return badRequestError("Location ID is required");
      }

      if (!user) {
        return internalError();
      }

      // Parse and validate request body using Zod schema
      const parseResult = parseJsonBody(event.body, submitCheckInSchema);

      if (!parseResult.success) {
        return validationError(parseResult.errors);
      }

      const { status, note, photoKey } = parseResult.data;

      // Check if location exists
      const location = await getLocation(locationId);
      if (!location) {
        return notFoundError("Location not found");
      }

      // Get username for denormalization
      // Security: Never fall back to email - use "Anonymous" instead
      const username = await getUsername(user.id) ?? "Anonymous";

      // Create check-in
      const checkIn: CheckIn = {
        id: uuidv4(),
        locationId,
        userId: user.id,
        username,
        status,
        note,
        photoKey,
        createdAt: new Date().toISOString(),
      };

      await createCheckIn(checkIn);

      // Security: Don't expose userId in response - return only safe fields
      const safeResponse = {
        id: checkIn.id,
        locationId: checkIn.locationId,
        username: checkIn.username,
        status: checkIn.status,
        note: checkIn.note,
        createdAt: checkIn.createdAt,
      };

      return successResponse({
        data: safeResponse,
        message: "Check-in submitted successfully!",
        statusCode: 201,
      });
    } catch (error) {
      console.error("Error submitting check-in:", error);
      return internalError();
    }
  }
);
