/**
 * Lambda function to check for duplicate locations.
 *
 * POST /locations/check-duplicate
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, validationError, internalError } from "@shared/utils/responses";
import { listLocations } from "@shared/db/locations";
import { checkDuplicateSchema, parseJsonBody } from "@shared/utils/validation";

/**
 * Calculate distance between two coordinates in miles using Haversine formula.
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Normalize address for comparison.
 */
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,]/g, "")
    .trim();
}

// Distance threshold in miles for considering a location as duplicate
const DUPLICATE_DISTANCE_THRESHOLD = 0.05; // ~264 feet

/**
 * Handle POST /locations/check-duplicate request.
 */
export async function handler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  try {
    // Parse and validate request body
    const parseResult = parseJsonBody(event.body, checkDuplicateSchema);

    if (!parseResult.success) {
      return validationError(parseResult.errors);
    }

    const { address, lat, lng } = parseResult.data;
    const normalizedAddress = normalizeAddress(address);

    // Get all active locations
    const locations = await listLocations({ status: "active" });

    // Check for duplicates
    for (const location of locations) {
      // Check by normalized address
      if (normalizeAddress(location.address) === normalizedAddress) {
        return successResponse({
          data: {
            isDuplicate: true,
            existingLocation: {
              id: location.id,
              address: location.address,
            },
          },
        });
      }

      // Check by coordinates if provided
      if (lat !== undefined && lng !== undefined) {
        const distance = calculateDistance(lat, lng, location.lat, location.lng);
        if (distance < DUPLICATE_DISTANCE_THRESHOLD) {
          return successResponse({
            data: {
              isDuplicate: true,
              existingLocation: {
                id: location.id,
                address: location.address,
                distance: Math.round(distance * 5280), // Convert to feet
              },
            },
          });
        }
      }
    }

    // No duplicate found
    return successResponse({
      data: {
        isDuplicate: false,
      },
    });
  } catch (error) {
    console.error("Error checking for duplicates:", error);
    return internalError();
  }
}
