/**
 * Lambda function to suggest addresses using AWS Location Service.
 *
 * POST /locations/suggest-addresses
 * Body: { "query": "123 Main St, Dallas" }
 *
 * Uses SearchPlaceIndexForSuggestions for real-time autocomplete.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import {
  LocationClient,
  SearchPlaceIndexForSuggestionsCommand,
  GetPlaceCommand,
} from "@aws-sdk/client-location";
import { successResponse, badRequestError, internalError, serviceUnavailableError } from "@shared/utils/responses";

// Initialize Location Service client
const locationClient = new LocationClient({});
const PLACE_INDEX_NAME = process.env.PLACE_INDEX_NAME || "christmas-lights-places-dev";

// North Texas center for biasing results (Dallas)
const NORTH_TEXAS_BIAS = {
  lat: 32.7767,
  lng: -96.797,
};

// Filter box for North Texas (wider area to catch suburbs)
const NORTH_TEXAS_FILTER = {
  minLat: 31.5,
  maxLat: 34.2,
  minLng: -98.5,
  maxLng: -95.5,
};

interface AddressSuggestion {
  address: string;
  lat: number | null;
  lng: number | null;
  displayName: string;
}

interface RequestBody {
  query?: string;
}

/**
 * Check if coordinates are within North Texas bounds.
 */
function isInNorthTexas(lat: number | null, lng: number | null): boolean {
  if (lat === null || lng === null) {
    return true; // Include if no coordinates
  }
  return (
    lat >= NORTH_TEXAS_FILTER.minLat &&
    lat <= NORTH_TEXAS_FILTER.maxLat &&
    lng >= NORTH_TEXAS_FILTER.minLng &&
    lng <= NORTH_TEXAS_FILTER.maxLng
  );
}

/**
 * Handle POST /locations/suggest-addresses request.
 */
export async function handler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    // Parse request body
    let body: RequestBody;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return badRequestError("Invalid JSON in request body");
    }

    const query = body.query?.trim();

    if (!query) {
      return badRequestError("Query parameter is required");
    }

    if (query.length < 3) {
      return badRequestError("Query must be at least 3 characters");
    }

    const suggestions: AddressSuggestion[] = [];

    try {
      // Use SearchPlaceIndexForSuggestions for autocomplete
      const searchCommand = new SearchPlaceIndexForSuggestionsCommand({
        IndexName: PLACE_INDEX_NAME,
        Text: query,
        MaxResults: 7,
        BiasPosition: [NORTH_TEXAS_BIAS.lng, NORTH_TEXAS_BIAS.lat],
        FilterCountries: ["USA"],
      });

      const response = await locationClient.send(searchCommand);
      const results = response.Results || [];

      // For each suggestion with a PlaceId, get the full place details
      for (const result of results) {
        const placeId = result.PlaceId;

        if (placeId) {
          try {
            // Get full place details including coordinates
            const getPlaceCommand = new GetPlaceCommand({
              IndexName: PLACE_INDEX_NAME,
              PlaceId: placeId,
            });
            const placeResponse = await locationClient.send(getPlaceCommand);
            const place = placeResponse.Place;

            if (place) {
              const point = place.Geometry?.Point;
              const lat = point ? point[1] : null;
              const lng = point ? point[0] : null;

              // Build display name from address components
              const addressParts: string[] = [];
              if (place.AddressNumber) {
                addressParts.push(place.AddressNumber);
              }
              if (place.Street) {
                if (addressParts.length > 0) {
                  addressParts[0] += ` ${place.Street}`;
                } else {
                  addressParts.push(place.Street);
                }
              }
              if (place.Municipality) {
                addressParts.push(place.Municipality);
              }
              if (place.Region) {
                addressParts.push(place.Region);
              }

              const displayName = addressParts.length > 0 ? addressParts.join(", ") : place.Label || "";

              // Filter to North Texas area
              if (isInNorthTexas(lat, lng)) {
                suggestions.push({
                  address: displayName,
                  lat,
                  lng,
                  displayName,
                });
              }
            }
          } catch (error) {
            console.error(`Error getting place ${placeId}:`, error);
            // Fall back to suggestion text without coordinates
            suggestions.push({
              address: result.Text || "",
              lat: null,
              lng: null,
              displayName: result.Text || "",
            });
          }
        } else {
          // No PlaceId, just use the text
          suggestions.push({
            address: result.Text || "",
            lat: null,
            lng: null,
            displayName: result.Text || "",
          });
        }
      }

      // Remove duplicates by address
      const seenAddresses = new Set<string>();
      const uniqueSuggestions = suggestions.filter((suggestion) => {
        const addr = suggestion.address.toLowerCase();
        if (seenAddresses.has(addr)) {
          return false;
        }
        seenAddresses.add(addr);
        return true;
      });

      return successResponse({
        data: {
          suggestions: uniqueSuggestions,
          query,
        },
      });
    } catch (error) {
      const errorCode = (error as { name?: string }).name || "Unknown";
      console.error(`AWS Location Service error: ${errorCode}`, error);

      if (errorCode === "ResourceNotFoundException") {
        return serviceUnavailableError("Address lookup service is not configured");
      } else if (errorCode === "AccessDeniedException") {
        return serviceUnavailableError("Address lookup service access denied");
      } else {
        return serviceUnavailableError("Address lookup service is temporarily unavailable");
      }
    }
  } catch (error) {
    console.error("Error suggesting addresses:", error);
    return internalError();
  }
}
