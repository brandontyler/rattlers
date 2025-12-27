/**
 * Lambda function to get a user's submissions.
 *
 * GET /users/{userId}/submissions
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, badRequestError, internalError } from "@shared/utils/responses";
import { listLocations } from "@shared/db/locations";
import { getSuggestionsByUser } from "@shared/db/suggestions";
import type { Location, Suggestion } from "@shared/types";

interface UserSubmission {
  id: string;
  address: string;
  description: string;
  status: string;
  type: "location" | "suggestion";
  createdAt: string;
  photos: string[];
}

/**
 * Handle GET /users/{userId}/submissions request.
 */
export async function handler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return badRequestError("User ID is required");
    }

    // Get approved locations created by this user
    const allLocations = await listLocations({ status: "active", limit: 500 });
    const userLocations = allLocations.filter((loc) => loc.createdBy === userId);

    // Get pending suggestions by this user
    const userSuggestions = await getSuggestionsByUser(userId);

    // Combine and format submissions
    const submissions: UserSubmission[] = [
      ...userLocations.map((loc: Location) => ({
        id: loc.id,
        address: loc.address,
        description: loc.description,
        status: "approved",
        type: "location" as const,
        createdAt: loc.createdAt,
        photos: loc.photos,
      })),
      ...userSuggestions.map((sug: Suggestion) => ({
        id: sug.id,
        address: sug.address,
        description: sug.description,
        status: sug.status,
        type: "suggestion" as const,
        createdAt: sug.createdAt,
        photos: sug.photos,
      })),
    ];

    // Sort by creation date (newest first)
    submissions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return successResponse({ data: submissions });
  } catch (error) {
    console.error("Error getting user submissions:", error);
    return internalError();
  }
}
