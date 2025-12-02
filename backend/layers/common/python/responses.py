"""API response utilities."""

import json
import os
from typing import Any, Dict, Optional
from http import HTTPStatus


def _get_cors_headers() -> Dict[str, str]:
    """Get CORS headers with appropriate origin."""
    allowed_origin = os.environ.get("ALLOWED_ORIGIN", "*")

    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Max-Age": "3600",
    }


def success_response(
    data: Any = None,
    message: Optional[str] = None,
    status_code: int = HTTPStatus.OK,
    pagination: Optional[Dict[str, Any]] = None,
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
        "headers": _get_cors_headers(),
        "body": json.dumps(body, default=str),
    }


def error_response(
    code: str,
    message: str,
    status_code: int = HTTPStatus.BAD_REQUEST,
    details: Optional[Dict[str, str]] = None,
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
        "headers": _get_cors_headers(),
        "body": json.dumps(body),
    }


def validation_error(details: Dict[str, str]) -> Dict[str, Any]:
    """Create a validation error response."""
    return error_response(
        code="VALIDATION_ERROR",
        message="Validation failed",
        status_code=HTTPStatus.BAD_REQUEST,
        details=details,
    )


def unauthorized_error(message: str = "Authentication required") -> Dict[str, Any]:
    """Create an unauthorized error response."""
    return error_response(
        code="UNAUTHORIZED",
        message=message,
        status_code=HTTPStatus.UNAUTHORIZED,
    )


def forbidden_error(message: str = "Access denied") -> Dict[str, Any]:
    """Create a forbidden error response."""
    return error_response(
        code="FORBIDDEN",
        message=message,
        status_code=HTTPStatus.FORBIDDEN,
    )


def not_found_error(message: str = "Resource not found") -> Dict[str, Any]:
    """Create a not found error response."""
    return error_response(
        code="NOT_FOUND",
        message=message,
        status_code=HTTPStatus.NOT_FOUND,
    )


def internal_error(message: str = "An unexpected error occurred") -> Dict[str, Any]:
    """Create an internal server error response."""
    return error_response(
        code="INTERNAL_ERROR",
        message=message,
        status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
    )
