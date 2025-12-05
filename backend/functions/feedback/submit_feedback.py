"""
Lambda function to submit feedback (like) for a location.

POST /locations/{id}/feedback
- Like: toggles like on/off (one per user per location)
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

        # Validate feedback type (only "like" is supported)
        if feedback_type != "like":
            return validation_error({"type": "Type must be 'like'"})

        # Check location exists
        locations_table = LocationsTable()
        location = locations_table.get(location_id)

        if not location:
            return not_found_error("Location not found")

        feedback_table = FeedbackTable()

        # Check if user already has feedback of this type for this location
        existing = feedback_table.get_user_feedback(location_id, user["id"], feedback_type)

        if existing:
            # Unlike - remove the feedback
            try:
                feedback_table.delete(existing["id"], location_id)
                locations_table.decrement_like_count(location_id)
                return success_response(
                    data={"liked": False, "locationId": location_id},
                    message="Like removed",
                )
            except Exception as e:
                print(f"Error removing like: {str(e)}")
                return internal_error()
        else:
            # Like - create new feedback with deterministic ID for atomic uniqueness
            # ID is based on user+location+type so duplicates will fail the conditional write
            feedback_id = f"like-{user['id']}-{location_id}"
            feedback_data = {
                "id": feedback_id,
                "locationId": location_id,
                "userId": user["id"],
                "type": "like",
                "createdAt": datetime.utcnow().isoformat() + "Z",
            }

            success, error_code = feedback_table.create_feedback_atomic(feedback_data)

            if success:
                # Successfully created - increment count
                locations_table.increment_like_count(location_id)
                return success_response(
                    data={"liked": True, "id": feedback_id, "locationId": location_id},
                    message="Location liked!",
                    status_code=201,
                )
            elif error_code == "ConditionalCheckFailedException":
                # Race condition detected - user already liked, return current state
                print(f"Race condition detected for user {user['id']} on location {location_id}")
                existing = feedback_table.get_user_feedback(location_id, user["id"], "like")

                return success_response(
                    data={
                        "liked": True,
                        "id": existing["id"] if existing else feedback_id,
                        "locationId": location_id
                    },
                    message="Location liked!",
                    status_code=200,
                )
            else:
                print(f"Unexpected error in atomic create: {error_code}")
                return internal_error()

    except Exception as e:
        print(f"Error submitting feedback: {str(e)}")
        return internal_error()
