/**
 * Lambda function to get a user's submissions.
 *
 * GET /users/submissions
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, internalError } from "@shared/utils/responses";
import { listLocations } from "@shared/db/locations";
import { getSuggestionsByUser } from "@shared/db/suggestions";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import type { AuthenticatedEvent, Location, Suggestion } from "@shared/types";

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
 * Handle GET /users/submissions request.
 */
export const handler = requireAuth(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const user = getUserInfo(event);

      if (!user) {
        return internalError();
      }

      // Get approved locations created by this user
      const allLocations = await listLocations({ status: "active", limit: 500 });
      const userLocations = allLocations.filter((loc) => loc.createdBy === user.id);

      // Get pending suggestions by this user
      const userSuggestions = await getSuggestionsByUser(user.id);

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
);
