"""Authentication and authorization utilities.

Permission Groups (Christmas-themed):
- NorthPoleCouncil: Super admins with full access
- SantasHelpers: Can approve/reject submissions
- WorkshopElves: Can edit location details
- ChimneySweeps: Moderators who handle reports
- Admins: Legacy group (treated same as NorthPoleCouncil)
"""

import json
from typing import Dict, List, Optional, Tuple, Set
from functools import wraps


# Permission group constants
class Groups:
    NORTH_POLE_COUNCIL = "NorthPoleCouncil"  # Super admin
    SANTAS_HELPERS = "SantasHelpers"          # Can approve/reject
    WORKSHOP_ELVES = "WorkshopElves"          # Can edit locations
    CHIMNEY_SWEEPS = "ChimneySweeps"          # Moderators
    ADMINS = "Admins"                         # Legacy (same as NorthPoleCouncil)


# Define which groups have which permissions
class Permissions:
    # Groups that can approve/reject submissions
    CAN_APPROVE = {Groups.NORTH_POLE_COUNCIL, Groups.ADMINS, Groups.SANTAS_HELPERS}

    # Groups that can edit location details
    CAN_EDIT = {Groups.NORTH_POLE_COUNCIL, Groups.ADMINS, Groups.WORKSHOP_ELVES}

    # Groups that can handle reports and moderation
    CAN_MODERATE = {Groups.NORTH_POLE_COUNCIL, Groups.ADMINS, Groups.CHIMNEY_SWEEPS}

    # Groups that can reject (moderators can reject but not approve)
    CAN_REJECT = {Groups.NORTH_POLE_COUNCIL, Groups.ADMINS, Groups.SANTAS_HELPERS, Groups.CHIMNEY_SWEEPS}

    # Groups that can delete content permanently
    CAN_DELETE = {Groups.NORTH_POLE_COUNCIL, Groups.ADMINS}

    # Groups that can view admin dashboard
    CAN_VIEW_ADMIN = {Groups.NORTH_POLE_COUNCIL, Groups.ADMINS, Groups.SANTAS_HELPERS, Groups.WORKSHOP_ELVES, Groups.CHIMNEY_SWEEPS}

    # Full admin access (super admin only)
    FULL_ADMIN = {Groups.NORTH_POLE_COUNCIL, Groups.ADMINS}


def extract_user_groups(event: Dict) -> List[str]:
    """Extract user's Cognito groups from API Gateway event."""
    try:
        if "requestContext" in event and "authorizer" in event["requestContext"]:
            claims = event["requestContext"]["authorizer"].get("claims", {})
            groups = claims.get("cognito:groups", "")
            if isinstance(groups, str):
                return groups.split(",") if groups else []
            return groups if groups else []
        return []
    except Exception as e:
        print(f"Error extracting groups: {e}")
        return []


def extract_user_from_event(event: Dict) -> Tuple[Optional[str], Optional[str], bool, List[str]]:
    """
    Extract user information from API Gateway event.

    Returns:
        Tuple of (user_id, email, is_admin, groups)
    """
    try:
        if "requestContext" in event and "authorizer" in event["requestContext"]:
            claims = event["requestContext"]["authorizer"].get("claims", {})

            if claims:
                user_id = claims.get("sub")
                email = claims.get("email")
                groups = extract_user_groups(event)

                # is_admin = any super admin group
                is_admin = bool(set(groups) & Permissions.FULL_ADMIN)

                return user_id, email, is_admin, groups

        return None, None, False, []

    except Exception as e:
        print(f"Error extracting user from event: {str(e)}")
        return None, None, False, []


def has_permission(groups: List[str], required_permission: Set[str]) -> bool:
    """Check if user has any of the required permission groups."""
    return bool(set(groups) & required_permission)


def require_auth(handler):
    """Decorator to require authentication for a Lambda function."""
    @wraps(handler)
    def wrapper(event, context):
        user_id, email, is_admin, groups = extract_user_from_event(event)

        if not user_id:
            from responses import unauthorized_error
            return unauthorized_error()

        # Add user info to event for handler to use
        event["user"] = {
            "id": user_id,
            "email": email,
            "is_admin": is_admin,
            "groups": groups,
            # Permission shortcuts
            "can_approve": has_permission(groups, Permissions.CAN_APPROVE),
            "can_edit": has_permission(groups, Permissions.CAN_EDIT),
            "can_moderate": has_permission(groups, Permissions.CAN_MODERATE),
            "can_reject": has_permission(groups, Permissions.CAN_REJECT),
            "can_delete": has_permission(groups, Permissions.CAN_DELETE),
            "can_view_admin": has_permission(groups, Permissions.CAN_VIEW_ADMIN),
        }

        return handler(event, context)

    return wrapper


def require_admin(handler):
    """Decorator to require full admin privileges (NorthPoleCouncil or Admins)."""
    @wraps(handler)
    def wrapper(event, context):
        user_id, email, is_admin, groups = extract_user_from_event(event)

        if not user_id:
            from responses import unauthorized_error
            return unauthorized_error()

        if not is_admin:
            from responses import forbidden_error
            return forbidden_error("Admin access required")

        event["user"] = {
            "id": user_id,
            "email": email,
            "is_admin": is_admin,
            "groups": groups,
            "can_approve": True,
            "can_edit": True,
            "can_moderate": True,
            "can_reject": True,
            "can_delete": True,
            "can_view_admin": True,
        }

        return handler(event, context)

    return wrapper


def require_permission(permission_set: Set[str], error_message: str = "Permission denied"):
    """
    Decorator factory to require specific permissions.

    Usage:
        @require_permission(Permissions.CAN_APPROVE, "Approval permission required")
        def handler(event, context):
            ...
    """
    def decorator(handler):
        @wraps(handler)
        def wrapper(event, context):
            user_id, email, is_admin, groups = extract_user_from_event(event)

            if not user_id:
                from responses import unauthorized_error
                return unauthorized_error()

            if not has_permission(groups, permission_set):
                from responses import forbidden_error
                return forbidden_error(error_message)

            event["user"] = {
                "id": user_id,
                "email": email,
                "is_admin": is_admin,
                "groups": groups,
                "can_approve": has_permission(groups, Permissions.CAN_APPROVE),
                "can_edit": has_permission(groups, Permissions.CAN_EDIT),
                "can_moderate": has_permission(groups, Permissions.CAN_MODERATE),
                "can_reject": has_permission(groups, Permissions.CAN_REJECT),
                "can_delete": has_permission(groups, Permissions.CAN_DELETE),
                "can_view_admin": has_permission(groups, Permissions.CAN_VIEW_ADMIN),
            }

            return handler(event, context)

        return wrapper
    return decorator


# Convenience decorators for common permission checks
def require_approval_permission(handler):
    """Decorator for endpoints that require approval permission (NorthPoleCouncil, Admins, SantasHelpers)."""
    return require_permission(Permissions.CAN_APPROVE, "Approval permission required")(handler)


def require_edit_permission(handler):
    """Decorator for endpoints that require edit permission (NorthPoleCouncil, Admins, WorkshopElves)."""
    return require_permission(Permissions.CAN_EDIT, "Edit permission required")(handler)


def require_moderation_permission(handler):
    """Decorator for endpoints that require moderation permission (NorthPoleCouncil, Admins, ChimneySweeps)."""
    return require_permission(Permissions.CAN_MODERATE, "Moderation permission required")(handler)


def require_admin_view(handler):
    """Decorator for endpoints that require admin dashboard access (any admin group)."""
    return require_permission(Permissions.CAN_VIEW_ADMIN, "Admin access required")(handler)


def get_user_info(event: Dict) -> Dict:
    """Get user information from event (assumes auth decorator was used)."""
    return event.get("user", {})
