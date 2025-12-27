/**
 * Validation schemas using Zod.
 *
 * Provides type-safe validation for API requests with
 * helpful error messages.
 */

import { z } from "zod";

/**
 * Latitude validation (-90 to 90).
 */
export const latitudeSchema = z
  .number()
  .min(-90, "Latitude must be between -90 and 90")
  .max(90, "Latitude must be between -90 and 90");

/**
 * Longitude validation (-180 to 180).
 */
export const longitudeSchema = z
  .number()
  .min(-180, "Longitude must be between -180 and 180")
  .max(180, "Longitude must be between -180 and 180");

/**
 * UUID string validation.
 */
export const uuidSchema = z.string().uuid("Invalid UUID format");

/**
 * Non-empty trimmed string.
 */
export const nonEmptyString = z.string().trim().min(1, "This field is required");

/**
 * Create location request schema.
 */
export const createLocationSchema = z.object({
  address: nonEmptyString.max(500, "Address must be 500 characters or less"),
  lat: latitudeSchema,
  lng: longitudeSchema,
  description: z.string().max(2000, "Description must be 2000 characters or less").default(""),
  photos: z.array(z.string()).max(10, "Maximum 10 photos allowed").default([]),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;

/**
 * Update location request schema.
 */
export const updateLocationSchema = z.object({
  address: z.string().trim().max(500, "Address must be 500 characters or less").optional(),
  description: z.string().max(2000, "Description must be 2000 characters or less").optional(),
  photos: z.array(z.string()).max(10, "Maximum 10 photos allowed").optional(),
  status: z.enum(["active", "inactive", "flagged"]).optional(),
});

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

/**
 * Submit suggestion request schema.
 */
export const submitSuggestionSchema = z.object({
  address: nonEmptyString.max(500, "Address must be 500 characters or less"),
  description: z.string().max(2000, "Description must be 2000 characters or less").default(""),
  photos: z.array(z.string()).max(3, "Maximum 3 photos allowed").default([]),
  lat: latitudeSchema.optional(),
  lng: longitudeSchema.optional(),
});

export type SubmitSuggestionInput = z.infer<typeof submitSuggestionSchema>;

/**
 * Create route request schema.
 */
export const createRouteSchema = z.object({
  title: nonEmptyString.max(100, "Title must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").default(""),
  locationIds: z
    .array(z.string())
    .min(1, "At least one location is required")
    .max(20, "Maximum 20 stops per route"),
  tags: z.array(z.string()).max(10, "Maximum 10 tags allowed").default([]),
  isPublic: z.boolean().default(true),
});

export type CreateRouteInput = z.infer<typeof createRouteSchema>;

/**
 * Update route request schema.
 */
export const updateRouteSchema = z.object({
  title: z.string().trim().max(100, "Title must be 100 characters or less").optional(),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  locationIds: z
    .array(z.string())
    .min(1, "At least one location is required")
    .max(20, "Maximum 20 stops per route")
    .optional(),
  tags: z.array(z.string()).max(10, "Maximum 10 tags allowed").optional(),
  isPublic: z.boolean().optional(),
});

export type UpdateRouteInput = z.infer<typeof updateRouteSchema>;

/**
 * Get upload URL request schema.
 */
export const getUploadUrlSchema = z.object({
  contentType: z.enum(
    ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
    { errorMap: () => ({ message: "Invalid content type. Allowed: jpeg, png, webp, heic, heif" }) }
  ),
  fileSize: z
    .number()
    .int("File size must be an integer")
    .positive("File size must be positive")
    .max(20 * 1024 * 1024, "File size must be 20MB or less"),
  suggestionId: z.string().optional(),
});

export type GetUploadUrlInput = z.infer<typeof getUploadUrlSchema>;

/**
 * Report location request schema.
 */
export const reportLocationSchema = z.object({
  category: z.enum(["no_longer_active", "wrong_location", "inappropriate", "duplicate", "other"]),
  details: z.string().max(500, "Details must be 500 characters or less").optional(),
});

export type ReportLocationInput = z.infer<typeof reportLocationSchema>;

/**
 * Check duplicate request schema.
 */
export const checkDuplicateSchema = z.object({
  address: nonEmptyString,
  lat: latitudeSchema.optional(),
  lng: longitudeSchema.optional(),
});

export type CheckDuplicateInput = z.infer<typeof checkDuplicateSchema>;

/**
 * Update user profile schema.
 */
export const updateProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or less")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .optional(),
  name: z.string().trim().max(100, "Name must be 100 characters or less").optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Query parameters for listing locations.
 */
export const listLocationsQuerySchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().min(0).max(100).default(10),
  search: z.string().optional(),
  status: z.enum(["active", "inactive", "flagged"]).default("active"),
  minRating: z.coerce.number().min(0).max(5).default(0),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

export type ListLocationsQuery = z.infer<typeof listLocationsQuerySchema>;

/**
 * Query parameters for listing routes.
 */
export const listRoutesQuerySchema = z.object({
  sortBy: z.enum(["popular", "new"]).default("popular"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListRoutesQuery = z.infer<typeof listRoutesQuerySchema>;

/**
 * Convert Zod errors to a details object.
 */
export function zodErrorToDetails(error: z.ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    details[path || "value"] = issue.message;
  }
  return details;
}

/**
 * Parse and validate JSON body from API Gateway event.
 */
export function parseJsonBody<T>(
  body: string | null,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  if (!body) {
    return { success: false, errors: { body: "Request body is required" } };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { success: false, errors: { body: "Invalid JSON in request body" } };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return { success: false, errors: zodErrorToDetails(result.error) };
  }

  return { success: true, data: result.data };
}

/**
 * Parse and validate query parameters.
 */
export function parseQueryParams<T>(
  params: Record<string, string | undefined> | null,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(params ?? {});
  if (!result.success) {
    return { success: false, errors: zodErrorToDetails(result.error) };
  }
  return { success: true, data: result.data };
}
