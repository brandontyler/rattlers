/**
 * Lambda function to analyze photos using AI (Bedrock).
 *
 * POST /photos/analyze
 *
 * This function uses AWS Bedrock with Claude to analyze
 * Christmas light display photos and generate descriptions.
 */

import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import {
  successResponse,
  badRequestError,
  validationError,
  internalError,
} from "@shared/utils/responses";
import { requireAdmin } from "@shared/utils/auth";
import type { AuthenticatedEvent } from "@shared/types";
import { z } from "zod";
import { parseJsonBody } from "@shared/utils/validation";

const bedrockClient = new BedrockRuntimeClient({});
const s3Client = new S3Client({});

const PHOTOS_BUCKET = process.env.PHOTOS_BUCKET_NAME ?? "christmas-lights-photos-dev";

const analyzePhotoSchema = z.object({
  photoKey: z.string().min(1),
});

/**
 * Handle POST /photos/analyze request.
 */
export const handler = requireAdmin(
  async (event: AuthenticatedEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    try {
      // Parse and validate request body
      const parseResult = parseJsonBody(event.body, analyzePhotoSchema);

      if (!parseResult.success) {
        return validationError(parseResult.errors);
      }

      const { photoKey } = parseResult.data;

      // Get photo from S3
      let imageData: Uint8Array;
      try {
        const response = await s3Client.send(
          new GetObjectCommand({
            Bucket: PHOTOS_BUCKET,
            Key: photoKey,
          })
        );

        if (!response.Body) {
          return badRequestError("Photo not found");
        }

        imageData = await response.Body.transformToByteArray();
      } catch (error) {
        console.error("Error fetching photo from S3:", error);
        return badRequestError("Failed to fetch photo");
      }

      // Determine media type from key
      const extension = photoKey.split(".").pop()?.toLowerCase() ?? "jpg";
      const mediaTypeMap: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        heic: "image/heic",
        heif: "image/heif",
      };
      const mediaType = mediaTypeMap[extension] ?? "image/jpeg";

      // Call Bedrock to analyze the photo
      const response = await bedrockClient.send(
        new InvokeModelCommand({
          modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 500,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: mediaType,
                      data: Buffer.from(imageData).toString("base64"),
                    },
                  },
                  {
                    type: "text",
                    text: `Analyze this Christmas light display photo and provide a brief, engaging description (2-3 sentences) that would help someone decide if they want to visit this location. Focus on:
- The types of decorations visible (lights, inflatables, yard decorations, etc.)
- The overall style (traditional, modern, animated, themed, etc.)
- Any standout features that make this display special

Be enthusiastic but accurate. If this doesn't appear to be a Christmas light display, say so.`,
                  },
                ],
              },
            ],
          }),
        })
      );

      // Parse response
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const description =
        responseBody.content?.[0]?.text ?? "Unable to analyze this photo.";

      return successResponse({
        data: {
          photoKey,
          description,
        },
      });
    } catch (error) {
      console.error("Error analyzing photo:", error);
      return internalError();
    }
  }
);
