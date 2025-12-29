/**
 * Lambda function to analyze photos using AI (Bedrock).
 *
 * POST /photos/analyze
 *
 * This function uses AWS Bedrock with Amazon Nova Pro to analyze
 * Christmas light display photos, detect decorations, and generate descriptions.
 *
 * Best practices implemented:
 * - System prompt with role assignment (reduces hallucinations)
 * - Structured JSON output for decoration inventory
 * - Explicit decoration categories with definitions
 * - Confidence scores for detected items
 * - Quality rating for the display
 * - Is-Christmas-display validation
 *
 * @see https://docs.aws.amazon.com/nova/latest/userguide/prompting-vision-prompting.html
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

/**
 * Model ID for Amazon Nova Pro - multimodal model optimized for vision tasks.
 * Uses cross-region inference profile for availability.
 */
const BEDROCK_MODEL_ID = "us.amazon.nova-pro-v1:0";

/**
 * Predefined decoration categories with descriptions for accurate detection.
 * These categories help the model understand what to look for.
 */
const DECORATION_CATEGORIES = {
  // Light types
  string_lights: "Traditional string lights (white, colored, or multi-colored)",
  icicle_lights: "Hanging icicle-style lights from roofline or trees",
  net_lights: "Mesh/net lights covering bushes or hedges",
  rope_lights: "Flexible tube lights for outlining or shapes",
  projection_lights: "Projected light patterns (snowflakes, stars, etc.)",
  laser_lights: "Laser light projectors creating star fields",
  animated_lights: "Lights that move, chase, or sync to music",
  candles: "Electric candle decorations in windows or yard",

  // Yard decorations
  inflatable: "Large inflatable characters (Santa, snowman, etc.)",
  blow_mold: "Classic plastic light-up figures (vintage style)",
  wooden_cutout: "Flat wooden painted decorations",
  metal_sculpture: "Wire-frame or metal decorations with lights",
  nativity: "Nativity scene display",
  snowman: "Snowman decorations (any type)",
  santa: "Santa Claus decorations (any type)",
  reindeer: "Reindeer or deer decorations",
  sleigh: "Sleigh decorations",
  candy_cane: "Candy cane decorations",
  wreath: "Wreaths on doors, windows, or yard",
  tree_outdoor: "Decorated outdoor Christmas tree",
  presents: "Gift box decorations",
  train: "Train set or locomotive decorations",
  nutcracker: "Nutcracker soldier decorations",
  gingerbread: "Gingerbread house or person decorations",
  polar_bear: "Polar bear decorations",
  penguin: "Penguin decorations",
  angel: "Angel decorations",
  star_topper: "Large star decorations",
  snowflake: "Snowflake decorations",
  arch: "Lit archway or tunnel",

  // Special features
  music_sync: "Display synchronized to music",
  animated_display: "Mechanical or moving elements",
  themed_display: "Cohesive theme (e.g., Winter Wonderland, North Pole)",
  mega_tree: "Large tree made of lights (usually in yard)",
  roofline_outline: "Lights outlining the entire roofline",
  window_decorations: "Decorated windows with lights or figures",
} as const;

type DecorationCategory = keyof typeof DECORATION_CATEGORIES;

/**
 * Analysis result from the AI model.
 */
interface PhotoAnalysisResult {
  /** Whether this appears to be a Christmas/holiday light display */
  isChristmasDisplay: boolean;
  /** Confidence in the isChristmasDisplay determination (0-100) */
  confidence: number;
  /** Detected decorations with confidence scores */
  decorations: Array<{
    category: DecorationCategory;
    confidence: number;
    count?: number;
    notes?: string;
  }>;
  /** Overall quality rating (1-5 stars) */
  qualityRating: number;
  /** Display style tags */
  styleTags: string[];
  /** Brief engaging description (2-3 sentences) */
  description: string;
  /** Reason if not a Christmas display */
  notChristmasReason?: string;
}

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

      // Determine file extension and format for the AI model
      const extension = photoKey.split(".").pop()?.toLowerCase() ?? "jpg";

      // Map extensions to Nova Pro supported formats
      // Nova Pro supports: jpeg, png, gif, webp
      // HEIC/HEIF (iPhone native) are NOT supported by Nova Pro
      const getNovaFormat = (ext: string): "jpeg" | "png" | "gif" | "webp" | null => {
        const formatMap: Record<string, "jpeg" | "png" | "gif" | "webp"> = {
          jpg: "jpeg",
          jpeg: "jpeg",
          png: "png",
          gif: "gif",
          webp: "webp",
        };
        return formatMap[ext] ?? null;
      };

      const novaFormat = getNovaFormat(extension);

      // Check for unsupported formats
      // Nova Pro supports: jpeg, png, gif, webp
      // HEIC/HEIF are not supported - but browsers typically convert these to JPEG on upload
      if (!novaFormat) {
        console.warn(`Unsupported image format: ${extension}`);
        return badRequestError(
          `Unsupported image format: .${extension}. Please upload as JPEG, PNG, GIF, or WebP. ` +
          `(Tip: Most browsers automatically convert iPhone photos to JPEG when uploading.)`
        );
      }

      // Build the system prompt with role assignment (reduces hallucinations)
      const systemPrompt = `You are an expert Christmas decoration analyst for a community app that helps people find amazing holiday light displays in their neighborhood. Your role is to accurately identify and catalog decorations visible in photos submitted by users.

Be accurate and honest - only report decorations you can clearly see. If you're uncertain about something, use a lower confidence score. Your analysis helps users decide which displays to visit.`;

      // Build the user prompt with explicit categories and structured output request
      // Best practice: Place image first, then text instructions
      const userPrompt = `Analyze this photo of a potential Christmas light display.

## Task
1. Determine if this is a Christmas/holiday light display
2. Identify all visible decorations from the categories below
3. Rate the overall quality and visual impact
4. Write an engaging description for visitors

## Decoration Categories to Detect
${Object.entries(DECORATION_CATEGORIES)
  .map(([key, desc]) => `- ${key}: ${desc}`)
  .join("\n")}

## Style Tags to Consider
Choose applicable tags: traditional, modern, animated, musical, themed, minimalist, maximalist, elegant, whimsical, religious, family-friendly, professional, DIY, vintage, colorful, white-only, multi-color

## Required Output Format (JSON)
Respond ONLY with valid JSON matching this exact structure:
{
  "isChristmasDisplay": boolean,
  "confidence": number (0-100),
  "decorations": [
    {
      "category": "category_key",
      "confidence": number (0-100),
      "count": number or null,
      "notes": "optional details"
    }
  ],
  "qualityRating": number (1-5),
  "styleTags": ["tag1", "tag2"],
  "description": "2-3 sentence engaging description",
  "notChristmasReason": "reason if isChristmasDisplay is false, otherwise null"
}

Important:
- Only include decorations you can clearly identify (confidence >= 50)
- Quality rating: 1=minimal, 2=modest, 3=nice, 4=impressive, 5=spectacular
- Description should be enthusiastic but accurate, highlighting standout features
- If not a Christmas display, explain what the image shows instead`;

      // Call Amazon Nova Pro for image analysis
      // Best practice: Image placed before text in content array
      const response = await bedrockClient.send(
        new InvokeModelCommand({
          modelId: BEDROCK_MODEL_ID,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify({
            schemaVersion: "messages-v1",
            system: [{ text: systemPrompt }],
            messages: [
              {
                role: "user",
                content: [
                  {
                    image: {
                      format: novaFormat,
                      source: {
                        bytes: Buffer.from(imageData).toString("base64"),
                      },
                    },
                  },
                  {
                    text: userPrompt,
                  },
                ],
              },
            ],
            inferenceConfig: {
              maxTokens: 1024,
              temperature: 0.3, // Lower temperature for more consistent structured output
            },
          }),
        })
      );

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const outputText = responseBody.output?.message?.content?.[0]?.text ?? "";

      // Extract JSON from response (handle potential markdown code blocks)
      let analysisResult: PhotoAnalysisResult;
      try {
        // Try to parse directly first
        const jsonMatch = outputText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }
        analysisResult = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError, "Raw:", outputText);
        // Fallback to basic response
        analysisResult = {
          isChristmasDisplay: true,
          confidence: 50,
          decorations: [],
          qualityRating: 3,
          styleTags: [],
          description: "A festive holiday light display.",
        };
      }

      // Validate and sanitize the result
      const validatedResult: PhotoAnalysisResult = {
        isChristmasDisplay: Boolean(analysisResult.isChristmasDisplay),
        confidence: Math.min(100, Math.max(0, Number(analysisResult.confidence) || 50)),
        decorations: Array.isArray(analysisResult.decorations)
          ? analysisResult.decorations
              .filter(
                (d) =>
                  typeof d === "object" &&
                  d !== null &&
                  typeof d.category === "string" &&
                  d.category in DECORATION_CATEGORIES
              )
              .map((d) => ({
                category: d.category as DecorationCategory,
                confidence: Math.min(100, Math.max(0, Number(d.confidence) || 50)),
                count: d.count != null ? Number(d.count) : undefined,
                notes: typeof d.notes === "string" ? d.notes : undefined,
              }))
          : [],
        qualityRating: Math.min(5, Math.max(1, Math.round(Number(analysisResult.qualityRating) || 3))),
        styleTags: Array.isArray(analysisResult.styleTags)
          ? analysisResult.styleTags.filter((t): t is string => typeof t === "string")
          : [],
        description:
          typeof analysisResult.description === "string" && analysisResult.description.length > 0
            ? analysisResult.description
            : "A festive holiday light display.",
        notChristmasReason:
          typeof analysisResult.notChristmasReason === "string"
            ? analysisResult.notChristmasReason
            : undefined,
      };

      return successResponse({
        data: {
          photoKey,
          analysis: validatedResult,
          // Keep backward compatibility with simple description field
          description: validatedResult.description,
        },
      });
    } catch (error) {
      console.error("Error analyzing photo:", error);
      return internalError();
    }
  }
);
