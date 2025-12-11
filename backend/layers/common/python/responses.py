"""API response utilities."""

import json
import os
from typing import Any, Dict, Optional
from http import HTTPStatus


def _get_allowed_origins() -> list:
    """Get list of allowed origins from environment."""
    origins_str = os.environ.get("ALLOWED_ORIGINS", "")
    if origins_str:
        return [o.strip() for o in origins_str.split(",") if o.strip()]
    # Fallback to single origin for backwards compatibility
    single = os.environ.get("ALLOWED_ORIGIN", "")
    return [single] if single else []


def _get_cors_origin(request_origin: str = "") -> str:
    """Get the appropriate CORS origin for the response."""
    allowed = _get_allowed_origins()
    
    # If request origin is in allowed list, return it
    if request_origin and request_origin in allowed:
        return request_origin
    
    # Return first allowed origin as default, or * if none configured
    return allowed[0] if allowed else "*"


def _get_cors_headers(request_origin: str = "") -> Dict[str, str]:
    """Get CORS headers with appropriate origin."""
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": _get_cors_origin(request_origin),
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Max-Age": "3600",
    }


def success_response(
    data: Any = None,
    message: Optional[str] = None,
    status_code: int = HTTPStatus.OK,
    pagination: Optional[Dict[str, Any]] = None,
    request_origin: str = "",
) -> Dict[str, Any]:
    """Create a successful API response."""
    body = {
        "success": True,
    }

    if data is not None:
        body["data"] = data

    if message:
        body["message"] = message

    if pagination:
        body["pagination"] = pagination

    return {
        "statusCode": status_code,
        "headers": _get_cors_headers(request_origin),
        "body": json.dumps(body, default=str),
    }


def error_response(
    code: str,
    message: str,
    status_code: int = HTTPStatus.BAD_REQUEST,
    details: Optional[Dict[str, str]] = None,
    request_origin: str = "",
) -> Dict[str, Any]:
    """Create an error API response."""
    error = {
        "code": code,
        "message": message,
    }

    if details:
        error["details"] = details

    body = {
        "success": False,
        "error": error,
    }

    return {
        "statusCode": status_code,
        "headers": _get_cors_headers(request_origin),
        "body": json.dumps(body),
    }


def validation_error(details: Dict[str, str], request_origin: str = "") -> Dict[str, Any]:
    """Create a validation error response."""
    return error_response(
        code="VALIDATION_ERROR",
        message="Validation failed",
        status_code=HTTPStatus.BAD_REQUEST,
        details=details,
        request_origin=request_origin,
    )


def unauthorized_error(message: str = "Authentication required", request_origin: str = "") -> Dict[str, Any]:
    """Create an unauthorized error response."""
    return error_response(
        code="UNAUTHORIZED",
        message=message,
        status_code=HTTPStatus.UNAUTHORIZED,
        request_origin=request_origin,
    )


def forbidden_error(message: str = "Access denied", request_origin: str = "") -> Dict[str, Any]:
    """Create a forbidden error response."""
    return error_response(
        code="FORBIDDEN",
        message=message,
        status_code=HTTPStatus.FORBIDDEN,
        request_origin=request_origin,
    )


def not_found_error(message: str = "Resource not found", request_origin: str = "") -> Dict[str, Any]:
    """Create a not found error response."""
    return error_response(
        code="NOT_FOUND",
        message=message,
        status_code=HTTPStatus.NOT_FOUND,
        request_origin=request_origin,
    )


def bad_request(message: str, request_origin: str = "") -> Dict[str, Any]:
    """Create a bad request error response."""
    return error_response(
        code="BAD_REQUEST",
        message=message,
        status_code=HTTPStatus.BAD_REQUEST,
        request_origin=request_origin,
    )


def internal_error(message: str = "An unexpected error occurred", request_origin: str = "") -> Dict[str, Any]:
    """Create an internal server error response."""
    return error_response(
        code="INTERNAL_ERROR",
        message=message,
        status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
        request_origin=request_origin,
    )
