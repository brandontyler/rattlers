/**
 * API request and response types.
 *
 * These types define the shape of API requests and responses
 * for all Lambda functions.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

/**
 * Extended API Gateway event with typed user info.
 */
export interface AuthenticatedEvent extends APIGatewayProxyEvent {
  user?: UserInfo;
}

/**
 * User information extracted from JWT claims.
 */
export interface UserInfo {
  /** Cognito user ID (sub claim) */
  id: string;
  /** User email */
  email?: string;
  /** Whether user has full admin access */
  isAdmin: boolean;
  /** Cognito groups the user belongs to */
  groups: string[];
  /** Permission flags */
  canApprove: boolean;
  canEdit: boolean;
  canModerate: boolean;
  canReject: boolean;
  canDelete: boolean;
  canViewAdmin: boolean;
}

/**
 * Standard Lambda handler signature.
 */
export type LambdaHandler = (
  event: APIGatewayProxyEvent,
  context: Context
) => Promise<APIGatewayProxyResult>;

/**
 * Authenticated Lambda handler signature.
 */
export type AuthenticatedHandler = (
  event: AuthenticatedEvent,
  context: Context
) => Promise<APIGatewayProxyResult>;

/**
 * Standard success response body.
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
  pagination?: PaginationInfo;
}

/**
 * Standard error response body.
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

/**
 * Pagination information for list responses.
 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Request to create a new location (admin only).
 */
export interface CreateLocationRequest {
  address: string;
  lat: number;
  lng: number;
  description?: string;
  photos?: string[];
}

/**
 * Request to update a location.
 */
export interface UpdateLocationRequest {
  address?: string;
  description?: string;
  photos?: string[];
  status?: "active" | "inactive" | "flagged";
}

/**
 * Request to submit a new suggestion.
 */
export interface SubmitSuggestionRequest {
  address: string;
  description?: string;
  photos?: string[];
  lat?: number;
  lng?: number;
}

/**
 * Request to create a new route.
 */
export interface CreateRouteRequest {
  title: string;
  description?: string;
  locationIds: string[];
  tags?: string[];
  isPublic?: boolean;
}

/**
 * Request to update a route.
 */
export interface UpdateRouteRequest {
  title?: string;
  description?: string;
  locationIds?: string[];
  tags?: string[];
  isPublic?: boolean;
}

/**
 * Request for presigned upload URL.
 */
export interface GetUploadUrlRequest {
  contentType: string;
  fileSize: number;
  suggestionId?: string;
}

/**
 * Response with presigned upload URL.
 */
export interface GetUploadUrlResponse {
  uploadUrl: string;
  fields: Record<string, string>;
  photoKey: string;
  expiresIn: number;
}

/**
 * Request to check for duplicate locations.
 */
export interface CheckDuplicateRequest {
  address: string;
  lat?: number;
  lng?: number;
}

/**
 * Response for duplicate check.
 */
export interface CheckDuplicateResponse {
  isDuplicate: boolean;
  existingLocation?: {
    id: string;
    address: string;
    distance?: number;
  };
}

/**
 * Report reason categories.
 */
export type ReportCategory =
  | "no_longer_active"
  | "wrong_location"
  | "inappropriate"
  | "duplicate"
  | "other";

/**
 * Request to report a location.
 */
export interface ReportLocationRequest {
  category: ReportCategory;
  details?: string;
}

/**
 * Feedback status response.
 */
export interface FeedbackStatusResponse {
  liked: boolean;
  favorited: boolean;
}

/**
 * Route feedback status response.
 */
export interface RouteFeedbackStatusResponse {
  liked: boolean;
  saved: boolean;
}
