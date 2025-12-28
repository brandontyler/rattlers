/**
 * Lambda function to get a user's submissions.
 *
 * GET /users/submissions
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { successResponse, internalError } from "@shared/utils/responses";
import { getSuggestionsByUser } from "@shared/db/suggestions";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import type { AuthenticatedEvent } from "@shared/types";

interface UserSubmission {
  id: string;
  address: string;
  description: string;
  photos: string[];
  status: string;
  submittedAt: string;
  lat: number;
  lng: number;
  reviewedAt?: string;
  rejectionReason?: string;
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

      // Get all suggestions by this user
      const userSuggestions = await getSuggestionsByUser(user.id);

      // Get CDN URL for photo URLs
      const cdnUrl = process.env.PHOTOS_CDN_URL || "";

      // Format submissions to match frontend expectations
      const submissions: UserSubmission[] = userSuggestions.map((sug) => {
        // Convert S3 keys to CDN URLs
        const photoUrls = (sug.photos || []).map((photo) => {
          if (photo.startsWith("http")) {
            return photo;
          }
          return cdnUrl ? `${cdnUrl}/${photo}` : photo;
        });

        const submission: UserSubmission = {
          id: sug.id,
          address: sug.address,
          description: sug.description || "",
          photos: photoUrls,
          status: sug.status,
          submittedAt: sug.createdAt,
          lat: sug.lat,
          lng: sug.lng,
        };

        // Add optional fields if present
        if (sug.reviewedAt) {
          submission.reviewedAt = sug.reviewedAt;
        }
        if (sug.rejectionReason) {
          submission.rejectionReason = sug.rejectionReason;
        }

        return submission;
      });

      // Sort by submission date (newest first)
      submissions.sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );

      return successResponse({ data: submissions });
    } catch (error) {
      console.error("Error getting user submissions:", error);
      return internalError();
    }
  }
);
