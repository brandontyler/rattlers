/**
 * Lambda function to suggest addresses based on partial input.
 *
 * GET /locations/suggest?q=123+main
 *
 * This is a simple implementation that searches existing locations.
 * For production, consider integrating with a geocoding service like
 * Google Places, Mapbox, or AWS Location Service.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, badRequestError, internalError } from "@shared/utils/responses";
import { listLocations } from "@shared/db/locations";

interface AddressSuggestion {
  address: string;
  locationId?: string;
  source: "existing" | "geocoded";
}

/**
 * Handle GET /locations/suggest request.
 */
export async function handler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    const query = event.queryStringParameters?.q?.trim().toLowerCase();

    if (!query || query.length < 3) {
      return badRequestError("Query must be at least 3 characters");
    }

    // Get existing locations
    const locations = await listLocations({ status: "active", limit: 500 });

    // Filter locations by address match
    const suggestions: AddressSuggestion[] = locations
      .filter((loc) => loc.address.toLowerCase().includes(query))
      .slice(0, 10)
      .map((loc) => ({
        address: loc.address,
        locationId: loc.id,
        source: "existing" as const,
      }));

    // TODO: Integrate with geocoding service for new addresses
    // Example with AWS Location Service:
    // const geoClient = new LocationClient({});
    // const geoResults = await geoClient.send(new SearchPlaceIndexForTextCommand({
    //   IndexName: process.env.PLACE_INDEX_NAME,
    //   Text: query,
    //   MaxResults: 5,
    // }));

    return successResponse({
      data: suggestions,
    });
  } catch (error) {
    console.error("Error suggesting addresses:", error);
    return internalError();
  }
}
