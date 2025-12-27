/**
 * API response utilities.
 *
 * Provides standardized response helpers for Lambda functions
 * with proper CORS headers and consistent response format.
 */

import type { APIGatewayProxyResult } from "aws-lambda";
import type { SuccessResponse, ErrorResponse, PaginationInfo } from "../types";

/**
 * Get list of allowed origins from environment.
 */
function getAllowedOrigins(): string[] {
  const originsStr = process.env.ALLOWED_ORIGINS ?? "";
  if (originsStr) {
    return originsStr
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  }
  // Fallback to single origin for backwards compatibility
  const single = process.env.ALLOWED_ORIGIN ?? "";
  return single ? [single] : [];
}

/**
 * Get the appropriate CORS origin for the response.
 */
function getCorsOrigin(requestOrigin = ""): string {
  const allowed = getAllowedOrigins();

  // If request origin is in allowed list, return it
  if (requestOrigin && allowed.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Return first allowed origin as default, or * if none configured
  return allowed[0] ?? "*";
}

/**
 * Get CORS headers with appropriate origin.
 */
function getCorsHeaders(requestOrigin = ""): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": getCorsOrigin(requestOrigin),
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Max-Age": "3600",
  };
}

/**
 * Create a successful API response.
 */
export function successResponse<T>(options: {
  data?: T;
  message?: string;
  statusCode?: number;
  pagination?: PaginationInfo;
  requestOrigin?: string;
}): APIGatewayProxyResult {
  const { data, message, statusCode = 200, pagination, requestOrigin = "" } = options;

  const body: SuccessResponse<T> = {
    success: true,
  };

  if (data !== undefined) {
    body.data = data;
  }

  if (message) {
    body.message = message;
  }

  if (pagination) {
    body.pagination = pagination;
  }

  return {
    statusCode,
    headers: getCorsHeaders(requestOrigin),
    body: JSON.stringify(body),
  };
}

/**
 * Create an error API response.
 */
export function errorResponse(options: {
  code: string;
  message: string;
  statusCode?: number;
  details?: Record<string, string>;
  requestOrigin?: string;
}): APIGatewayProxyResult {
  const { code, message, statusCode = 400, details, requestOrigin = "" } = options;

  const body: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details) {
    body.error.details = details;
  }

  return {
    statusCode,
    headers: getCorsHeaders(requestOrigin),
    body: JSON.stringify(body),
  };
}

/**
 * Create a validation error response.
 */
export function validationError(
  details: Record<string, string>,
  requestOrigin = ""
): APIGatewayProxyResult {
  return errorResponse({
    code: "VALIDATION_ERROR",
    message: "Validation failed",
    statusCode: 400,
    details,
    requestOrigin,
  });
}

/**
 * Create an unauthorized error response.
 */
export function unauthorizedError(
  message = "Authentication required",
  requestOrigin = ""
): APIGatewayProxyResult {
  return errorResponse({
    code: "UNAUTHORIZED",
    message,
    statusCode: 401,
    requestOrigin,
  });
}

/**
 * Create a forbidden error response.
 */
export function forbiddenError(message = "Access denied", requestOrigin = ""): APIGatewayProxyResult {
  return errorResponse({
    code: "FORBIDDEN",
    message,
    statusCode: 403,
    requestOrigin,
  });
}

/**
 * Create a not found error response.
 */
export function notFoundError(
  message = "Resource not found",
  requestOrigin = ""
): APIGatewayProxyResult {
  return errorResponse({
    code: "NOT_FOUND",
    message,
    statusCode: 404,
    requestOrigin,
  });
}

/**
 * Create a bad request error response.
 */
export function badRequestError(message: string, requestOrigin = ""): APIGatewayProxyResult {
  return errorResponse({
    code: "BAD_REQUEST",
    message,
    statusCode: 400,
    requestOrigin,
  });
}

/**
 * Create an internal server error response.
 */
export function internalError(
  message = "An unexpected error occurred",
  requestOrigin = ""
): APIGatewayProxyResult {
  return errorResponse({
    code: "INTERNAL_ERROR",
    message,
    statusCode: 500,
    requestOrigin,
  });
}

/**
 * Create a CORS preflight response.
 */
export function corsPreflightResponse(requestOrigin = ""): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: getCorsHeaders(requestOrigin),
    body: "",
  };
}
