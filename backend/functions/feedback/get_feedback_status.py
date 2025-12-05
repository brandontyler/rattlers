"""
Lambda function to get user's feedback status for a location.
GET /locations/{id}/feedback/status
"""

import json
from typing import Dict, Any
from auth import require_auth, get_user_info
from responses import success_response, validation_error, internal_error
from db import FeedbackTable


@require_auth
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle GET /locations/{id}/feedback/status request."""
    try:
        user = get_user_info(event)
        location_id = event.get("pathParameters", {}).get("id")

        if not location_id:
            return validation_error({"id": "Location ID is required"})

        feedback_table = FeedbackTable()

        # Get user's like feedback
        like_feedback = feedback_table.get_user_feedback(
            location_id, user["id"], "like"
        )

        # Get user's report feedback
        report_feedback = feedback_table.get_user_feedback(
            location_id, user["id"], "report"
        )

        # Build response
        data = {
            "locationId": location_id,
            "liked": like_feedback is not None,
            "reported": report_feedback is not None,
        }

        if like_feedback:
            data["likedAt"] = like_feedback.get("createdAt")

        return success_response(data=data)

    except Exception as e:
        print(f"Error getting feedback status: {str(e)}")
        return internal_error()
