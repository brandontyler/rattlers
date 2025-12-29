/**
 * Lambda function to suggest addresses using AWS Location Service V2 Places API.
 *
 * POST /locations/suggest-addresses
 * Body: { "query": "123 Main St, Dallas" }
 *
 * Uses the V2 Autocomplete API for real-time address completion - no Place Index required.
 * The Autocomplete API is specifically designed for completing street addresses,
 * unlike the Suggest API which is for broader query predictions.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import {
  GeoPlacesClient,
  AutocompleteCommand,
  GetPlaceCommand,
} from "@aws-sdk/client-geo-places";
import { successResponse, badRequestError, internalError, serviceUnavailableError } from "@shared/utils/responses";

// Initialize Location Service V2 client
const geoPlacesClient = new GeoPlacesClient({});

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
      // Use V2 Autocomplete API for address completion - no Place Index required!
      // Autocomplete is specifically designed for completing street addresses,
      // unlike Suggest which is for broader query predictions and POIs.
      //
      // Note: BiasPosition and Filter.BoundingBox are mutually exclusive per AWS docs.
      // We use BiasPosition to prefer results near Dallas, and IncludeCountries to
      // limit to USA. Geographic filtering to North Texas is done post-query via
      // isInNorthTexas() to avoid the mutual exclusivity issue.
      const autocompleteCommand = new AutocompleteCommand({
        QueryText: query,
        MaxResults: 7,
        BiasPosition: [NORTH_TEXAS_BIAS.lng, NORTH_TEXAS_BIAS.lat],
        Filter: {
          IncludeCountries: ["USA"],
        },
      });

      const response = await geoPlacesClient.send(autocompleteCommand);
      const results = response.ResultItems || [];

      // For each autocomplete result with a PlaceId, get the full place details
      for (const result of results) {
        // V2 Autocomplete returns PlaceId directly on the result item
        const placeId = result.PlaceId;

        if (placeId) {
          try {
            // Get full place details including coordinates using V2 GetPlace
            const getPlaceCommand = new GetPlaceCommand({
              PlaceId: placeId,
            });
            const placeResponse = await geoPlacesClient.send(getPlaceCommand);

            // V2 returns position directly
            const position = placeResponse.Position;
            const lat = position ? position[1] : null;
            const lng = position ? position[0] : null;

            // Build display name from address components
            const address = placeResponse.Address;
            const addressParts: string[] = [];

            if (address?.AddressNumber) {
              addressParts.push(address.AddressNumber);
            }
            if (address?.Street) {
              if (addressParts.length > 0) {
                addressParts[0] += ` ${address.Street}`;
              } else {
                addressParts.push(address.Street);
              }
            }
            if (address?.Locality) {
              addressParts.push(address.Locality);
            }
            if (address?.Region?.Name) {
              addressParts.push(address.Region.Name);
            }

            const displayName = addressParts.length > 0
              ? addressParts.join(", ")
              : placeResponse.Title || result.Title || "";

            // Filter to North Texas area (double-check since BoundingBox filter should handle this)
            if (isInNorthTexas(lat, lng)) {
              suggestions.push({
                address: displayName,
                lat,
                lng,
                displayName,
              });
            }
          } catch (error) {
            console.error(`Error getting place ${placeId}:`, error);
            // Fall back to suggestion text without coordinates
            const title = result.Title || result.PlaceType || "";
            suggestions.push({
              address: title,
              lat: null,
              lng: null,
              displayName: title,
            });
          }
        } else if (result.Title) {
          // No PlaceId, just use the title
          suggestions.push({
            address: result.Title,
            lat: null,
            lng: null,
            displayName: result.Title,
          });
        }
      }

      // Filter out suggestions with null coordinates (they're not useful for geocoding)
      // and remove duplicates by address
      const seenAddresses = new Set<string>();
      const validSuggestions = suggestions.filter((suggestion) => {
        // Must have valid coordinates
        if (suggestion.lat === null || suggestion.lng === null) {
          return false;
        }
        // Must be unique
        const addr = suggestion.address.toLowerCase();
        if (seenAddresses.has(addr)) {
          return false;
        }
        seenAddresses.add(addr);
        return true;
      });

      return successResponse({
        data: {
          suggestions: validSuggestions,
          query,
        },
      });
    } catch (error) {
      const errorCode = (error as { name?: string }).name || "Unknown";
      console.error(`AWS Location Service V2 error: ${errorCode}`, error);

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
