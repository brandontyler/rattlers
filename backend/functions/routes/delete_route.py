"""
Lambda function to delete a route.

DELETE /routes/{id}
- Only the route owner can delete
"""

from typing import Dict, Any

from auth import require_auth, get_user_info
from responses import success_response, error_response, validation_error, not_found_error, internal_error
from db import RoutesTable, RouteFeedbackTable


@require_auth
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle DELETE /routes/{id} request."""
    try:
        user = get_user_info(event)
        route_id = event.get("pathParameters", {}).get("id")

        if not route_id:
            return validation_error({"id": "Route ID is required"})

        # Get existing route
        routes_table = RoutesTable()
        route = routes_table.get(route_id)

        if not route:
            return not_found_error("Route not found")

        # Check ownership
        if route.get("createdBy") != user["id"]:
            return error_response(
                message="You can only delete your own routes",
                status_code=403,
            )

        # Delete all feedback for this route
        feedback_table = RouteFeedbackTable()
        feedback_table.delete_all_for_route(route_id)

        # Delete the route
        routes_table.delete(route_id)

        return success_response(
            data={"id": route_id},
            message="Route deleted successfully",
        )

    except Exception as e:
        print(f"Error deleting route: {str(e)}")
        import traceback
        traceback.print_exc()
        return internal_error()
