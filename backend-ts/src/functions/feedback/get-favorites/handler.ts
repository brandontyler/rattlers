/**
 * Lambda function to get user's favorite locations.
 *
 * GET /users/me/favorites
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, internalError } from "@shared/utils/responses";
import { getUserFavorites } from "@shared/db/feedback";
import { getLocation } from "@shared/db/locations";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import type { AuthenticatedEvent, Location } from "@shared/types";

/**
 * Handle GET /users/me/favorites request.
 */
export const handler = requireAuth(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const user = getUserInfo(event);

      if (!user) {
        return internalError();
      }

      // Get all favorite feedback for this user
      const favorites = await getUserFavorites(user.id);

      // Fetch location details
      const locationPromises = favorites.map((fav) => getLocation(fav.locationId));
      const locationResults = await Promise.all(locationPromises);

      // Filter out null results (deleted locations)
      const locations: Location[] = locationResults.filter(
        (loc): loc is Location => loc !== null
      );

      return successResponse({ data: locations });
    } catch (error) {
      console.error("Error getting favorites:", error);
      return internalError();
    }
  }
);
