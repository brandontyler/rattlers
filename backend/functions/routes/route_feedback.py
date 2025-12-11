"""
Lambda function to submit feedback (like/save) for a route.

POST /routes/{id}/feedback
- Like: toggles like on/off
- Save: toggles save on/off
"""

import json
from datetime import datetime
from typing import Dict, Any

from auth import require_auth, get_user_info
from responses import success_response, error_response, validation_error, not_found_error, internal_error
from db import RoutesTable, RouteFeedbackTable


@require_auth
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle POST /routes/{id}/feedback request."""
    try:
        user = get_user_info(event)
        route_id = event.get("pathParameters", {}).get("id")

        if not route_id:
            return validation_error({"id": "Route ID is required"})

        # Parse request body
        try:
            body = json.loads(event.get("body") or "{}")
        except json.JSONDecodeError:
            return validation_error({"body": "Invalid JSON"})

        feedback_type = body.get("type")

        # Validate feedback type
        if feedback_type not in ["like", "save"]:
            return validation_error({"type": "Type must be 'like' or 'save'"})

        # Check route exists
        routes_table = RoutesTable()
        route = routes_table.get(route_id)

        if not route:
            return not_found_error("Route not found")

        # Only active routes can receive feedback (unless you're the owner)
        if route.get("status") != "active" and route.get("createdBy") != user["id"]:
            return not_found_error("Route not found")

        feedback_table = RouteFeedbackTable()

        # Check if user already has feedback of this type for this route
        existing = feedback_table.get_user_feedback(route_id, user["id"], feedback_type)

        if existing:
            # Remove the feedback
            try:
                feedback_table.delete(existing["id"], route_id)

                if feedback_type == "like":
                    routes_table.decrement_like_count(route_id)
                    return success_response(
                        data={"liked": False, "routeId": route_id},
                        message="Like removed",
                    )
                else:
                    routes_table.decrement_save_count(route_id)
                    return success_response(
                        data={"saved": False, "routeId": route_id},
                        message="Route unsaved",
                    )
            except Exception as e:
                print(f"Error removing feedback: {str(e)}")
                return internal_error()
        else:
            # Create new feedback with deterministic ID
            feedback_id = f"{feedback_type}-{user['id']}-{route_id}"
            feedback_data = {
                "id": feedback_id,
                "routeId": route_id,
                "userId": user["id"],
                "type": feedback_type,
                "createdAt": datetime.utcnow().isoformat() + "Z",
            }

            success, error_code = feedback_table.create_atomic(feedback_data)

            if success:
                if feedback_type == "like":
                    routes_table.increment_like_count(route_id)
                    return success_response(
                        data={"liked": True, "id": feedback_id, "routeId": route_id},
                        message="Route liked!",
                        status_code=201,
                    )
                else:
                    routes_table.increment_save_count(route_id)
                    return success_response(
                        data={"saved": True, "id": feedback_id, "routeId": route_id},
                        message="Route saved!",
                        status_code=201,
                    )
            elif error_code == "ConditionalCheckFailedException":
                # Race condition - feedback already exists
                print(f"Race condition detected for user {user['id']} on route {route_id}")
                existing = feedback_table.get_user_feedback(route_id, user["id"], feedback_type)

                if feedback_type == "like":
                    return success_response(
                        data={
                            "liked": True,
                            "id": existing["id"] if existing else feedback_id,
                            "routeId": route_id
                        },
                        message="Route liked!",
                        status_code=200,
                    )
                else:
                    return success_response(
                        data={
                            "saved": True,
                            "id": existing["id"] if existing else feedback_id,
                            "routeId": route_id
                        },
                        message="Route saved!",
                        status_code=200,
                    )
            else:
                print(f"Unexpected error in atomic create: {error_code}")
                return internal_error()

    except Exception as e:
        print(f"Error submitting route feedback: {str(e)}")
        import traceback
        traceback.print_exc()
        return internal_error()
