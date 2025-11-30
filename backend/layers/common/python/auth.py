"""Authentication utilities."""

import os
import json
import base64
from typing import Dict, Optional, Tuple
from functools import wraps


def extract_user_from_event(event: Dict) -> Tuple[Optional[str], Optional[str], bool]:
    """
    Extract user information from API Gateway event.

    Returns:
        Tuple of (user_id, email, is_admin)
    """
    try:
        # Check for Cognito authorizer claims
        if "requestContext" in event and "authorizer" in event["requestContext"]:
            claims = event["requestContext"]["authorizer"].get("claims", {})

            if claims:
                user_id = claims.get("sub")
                email = claims.get("email")

                # Check for admin group
                groups = claims.get("cognito:groups", "")
                if isinstance(groups, str):
                    groups = groups.split(",") if groups else []

                is_admin = "Admins" in groups

                return user_id, email, is_admin

        return None, None, False

    except Exception as e:
        print(f"Error extracting user from event: {str(e)}")
        return None, None, False


def require_auth(handler):
    """Decorator to require authentication for a Lambda function."""
    @wraps(handler)
    def wrapper(event, context):
        user_id, email, is_admin = extract_user_from_event(event)

        if not user_id:
            from responses import unauthorized_error
            return unauthorized_error()

        # Add user info to event for handler to use
        event["user"] = {
            "id": user_id,
            "email": email,
            "is_admin": is_admin,
        }

        return handler(event, context)

    return wrapper


def require_admin(handler):
    """Decorator to require admin privileges for a Lambda function."""
    @wraps(handler)
    def wrapper(event, context):
        user_id, email, is_admin = extract_user_from_event(event)

        if not user_id:
            from responses import unauthorized_error
            return unauthorized_error()

        if not is_admin:
            from responses import forbidden_error
            return forbidden_error("Admin access required")

        # Add user info to event for handler to use
        event["user"] = {
            "id": user_id,
            "email": email,
            "is_admin": is_admin,
        }

        return handler(event, context)

    return wrapper


def get_user_info(event: Dict) -> Dict[str, any]:
    """
    Get user information from event (assumes auth decorator was used).
    """
    return event.get("user", {})
