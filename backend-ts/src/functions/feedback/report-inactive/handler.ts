/**
 * Lambda function to report a location as inactive.
 *
 * POST /locations/{id}/report
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import {
  successResponse,
  notFoundError,
  badRequestError,
  validationError,
  internalError,
} from "@shared/utils/responses";
import { getLocation, incrementReportCount, updateLocation } from "@shared/db/locations";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import { reportLocationSchema, parseJsonBody } from "@shared/utils/validation";
import type { AuthenticatedEvent } from "@shared/types";

// Number of reports before auto-flagging
const AUTO_FLAG_THRESHOLD = 3;

/**
 * Handle POST /locations/{id}/report request.
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

      // Check if location exists
      const location = await getLocation(locationId);
      if (!location) {
        return notFoundError("Location not found");
      }

      // Parse and validate request body
      const parseResult = parseJsonBody(event.body, reportLocationSchema);

      if (!parseResult.success) {
        return validationError(parseResult.errors);
      }

      const { category, details } = parseResult.data;

      // Increment report count
      const newReportCount = await incrementReportCount(locationId);

      // Auto-flag if threshold reached
      if (newReportCount >= AUTO_FLAG_THRESHOLD && location.status === "active") {
        await updateLocation(locationId, {
          status: "flagged",
          updatedAt: new Date().toISOString(),
        });
      }

      // TODO: Store the report details for admin review
      // Security: Don't log userId to protect reporter identity
      console.log(`Report submitted for location ${locationId}:`, {
        category,
        hasDetails: Boolean(details),
        reportCount: newReportCount,
      });

      return successResponse({
        message: "Thank you for your report. We will review this location.",
      });
    } catch (error) {
      console.error("Error reporting location:", error);
      return internalError();
    }
  }
);
