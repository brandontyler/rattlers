"""
Lambda function to get routes created by the current user.

GET /users/routes
"""

from typing import Dict, Any

from auth import require_auth, get_user_info
from responses import success_response, internal_error
from db import RoutesTable


@require_auth
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle GET /users/routes request."""
    try:
        user = get_user_info(event)

        # Parse query parameters
        params = event.get("queryStringParameters") or {}
        limit = min(int(params.get("limit", "50")), 100)

        # Get user's routes
        routes_table = RoutesTable()
        routes = routes_table.list_by_user(user["id"], limit=limit)

        return success_response(data=routes)

    except Exception as e:
        print(f"Error getting user routes: {str(e)}")
        import traceback
        traceback.print_exc()
        return internal_error()
