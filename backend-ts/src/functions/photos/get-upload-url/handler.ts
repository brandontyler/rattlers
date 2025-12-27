/**
 * Lambda function to generate presigned POST URLs for photo uploads.
 *
 * POST /photos/upload-url
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { v4 as uuidv4 } from "uuid";
import {
  successResponse,
  validationError,
  corsPreflightResponse,
  internalError,
} from "@shared/utils/responses";
import { requireAuth, getUserInfo } from "@shared/utils/auth";
import { getUploadUrlSchema, parseJsonBody } from "@shared/utils/validation";
import type { AuthenticatedEvent } from "@shared/types";

const s3Client = new S3Client({});

const PHOTOS_BUCKET = process.env.PHOTOS_BUCKET_NAME ?? "christmas-lights-photos-dev";
const URL_EXPIRATION_SECONDS = 900; // 15 minutes
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

/**
 * Map content type to file extension.
 */
function getExtensionFromContentType(contentType: string): string {
  const mapping: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  return mapping[contentType] ?? "jpg";
}

/**
 * Handle POST /photos/upload-url request.
 */
export const handler = requireAuth(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      // Handle preflight
      if (event.httpMethod === "OPTIONS") {
        return corsPreflightResponse();
      }

      const user = getUserInfo(event);

      if (!user) {
        return internalError();
      }

      // Parse and validate request body
      const parseResult = parseJsonBody(event.body, getUploadUrlSchema);

      if (!parseResult.success) {
        return validationError(parseResult.errors);
      }

      const { contentType, fileSize, suggestionId } = parseResult.data;

      // Generate unique object key
      const fileExt = getExtensionFromContentType(contentType);
      const photoId = uuidv4();
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

      // Key format: pending/{userId}/{timestamp}_{photoId}.{ext}
      let photoKey: string;
      if (suggestionId) {
        photoKey = `pending/${suggestionId}/${photoId}.${fileExt}`;
      } else {
        photoKey = `pending/${user.id}/${timestamp}_${photoId}.${fileExt}`;
      }

      // Generate presigned POST URL with conditions
      const { url, fields } = await createPresignedPost(s3Client, {
        Bucket: PHOTOS_BUCKET,
        Key: photoKey,
        Conditions: [
          ["content-length-range", 1, MAX_FILE_SIZE],
          ["eq", "$Content-Type", contentType],
        ],
        Fields: {
          "Content-Type": contentType,
        },
        Expires: URL_EXPIRATION_SECONDS,
      });

      return successResponse({
        data: {
          uploadUrl: url,
          fields,
          photoKey,
          expiresIn: URL_EXPIRATION_SECONDS,
        },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      return internalError();
    }
  }
);
