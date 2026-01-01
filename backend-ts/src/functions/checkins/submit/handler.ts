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
  internalError,
} from "@shared/utils/responses";
import { getLocation } from "@shared/db/locations";
import { createCheckIn } from "@shared/db/checkins";
import { getUsername } from "@shared/db/users";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import type { AuthenticatedEvent, CheckIn, SubmitCheckInRequest } from "@shared/types";

const VALID_STATUSES = ["on", "off", "amazing", "changed"] as const;

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

      // Parse request body
      let body: SubmitCheckInRequest;
      try {
        body = JSON.parse(event.body ?? "{}");
      } catch {
        return badRequestError("Invalid JSON body");
      }

      // Validate status
      if (!body.status || !VALID_STATUSES.includes(body.status as typeof VALID_STATUSES[number])) {
        return badRequestError(`Status must be one of: ${VALID_STATUSES.join(", ")}`);
      }

      // Validate note length if provided
      if (body.note && body.note.length > 280) {
        return badRequestError("Note must be 280 characters or less");
      }

      // Check if location exists
      const location = await getLocation(locationId);
      if (!location) {
        return notFoundError("Location not found");
      }

      // Get username for denormalization
      const username = await getUsername(user.id) ?? user.email ?? "Anonymous";

      // Create check-in
      const checkIn: CheckIn = {
        id: uuidv4(),
        locationId,
        userId: user.id,
        username,
        status: body.status,
        note: body.note,
        photoKey: body.photoKey,
        createdAt: new Date().toISOString(),
      };

      await createCheckIn(checkIn);

      return successResponse({
        data: checkIn,
        message: "Check-in submitted successfully!",
        statusCode: 201,
      });
    } catch (error) {
      console.error("Error submitting check-in:", error);
      return internalError();
    }
  }
);
