"""
Lambda function to submit feedback (like/rating) for a location.

POST /locations/{id}/feedback
"""

import json
from uuid import uuid4
from datetime import datetime
from typing import Dict, Any
from auth import require_auth, get_user_info
from responses import success_response, error_response, validation_error, not_found_error, internal_error
from db import LocationsTable, FeedbackTable


@require_auth
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle POST /locations/{id}/feedback request."""
    try:
        user = get_user_info(event)
        location_id = event.get("pathParameters", {}).get("id")

        if not location_id:
            return validation_error({"id": "Location ID is required"})

        # Parse request body
        try:
            body = json.loads(event.get("body") or "{}")
        except json.JSONDecodeError:
            return validation_error({"body": "Invalid JSON"})

        feedback_type = body.get("type")
        rating = body.get("rating")

        # Validate feedback type
        if feedback_type not in ["like", "star"]:
            return validation_error({"type": "Type must be 'like' or 'star'"})

        # Validate rating for star type
        if feedback_type == "star":
            if rating is None:
                return validation_error({"rating": "Rating is required for star feedback"})
            try:
                rating = int(rating)
                if not 1 <= rating <= 5:
                    return validation_error({"rating": "Rating must be between 1 and 5"})
            except (ValueError, TypeError):
                return validation_error({"rating": "Rating must be a number"})

        # Check location exists
        locations_table = LocationsTable()
        location = locations_table.get(location_id)

        if not location:
            return not_found_error("Location not found")

        # Create feedback record
        feedback_id = str(uuid4())
        feedback_table = FeedbackTable()
        feedback = feedback_table.create({
            "id": feedback_id,
            "locationId": location_id,
            "userId": user["id"],
            "type": feedback_type,
            "rating": rating if feedback_type == "star" else None,
            "createdAt": datetime.utcnow().isoformat() + "Z",
        })

        # Update location stats
        if feedback_type == "like":
            locations_table.increment_like_count(location_id)
        else:
            # Recalculate average rating
            new_avg = feedback_table.calculate_average_rating(location_id)
            locations_table.update_rating(location_id, new_avg)

        locations_table.increment_feedback_count(location_id)

        return success_response(
            data={
                "id": feedback_id,
                "locationId": location_id,
                "type": feedback_type,
                "rating": rating if feedback_type == "star" else None,
            },
            message="Feedback submitted successfully",
            status_code=201,
        )

    except Exception as e:
        print(f"Error submitting feedback: {str(e)}")
        return internal_error()
