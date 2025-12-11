"""
Lambda function to get user's feedback status for a route.

GET /routes/{id}/feedback/status
"""

from typing import Dict, Any

from auth import require_auth, get_user_info
from responses import success_response, validation_error, internal_error
from db import RouteFeedbackTable


@require_auth
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle GET /routes/{id}/feedback/status request."""
    try:
        user = get_user_info(event)
        route_id = event.get("pathParameters", {}).get("id")

        if not route_id:
            return validation_error({"id": "Route ID is required"})

        feedback_table = RouteFeedbackTable()
        status = feedback_table.get_user_feedback_all_types(route_id, user["id"])

        return success_response(data={
            "routeId": route_id,
            "liked": status["liked"],
            "saved": status["saved"],
        })

    except Exception as e:
        print(f"Error getting route feedback status: {str(e)}")
        import traceback
        traceback.print_exc()
        return internal_error()
