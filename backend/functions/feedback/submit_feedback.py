"""
Lambda function to submit feedback (like/rating) for a location.

POST /locations/{id}/feedback
- Like: toggles like on/off (one per user per location)
- Star: allows one rating per user (updates if exists)
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

        feedback_table = FeedbackTable()

        # Check if user already has feedback of this type for this location
        existing = feedback_table.get_user_feedback(location_id, user["id"], feedback_type)

        if feedback_type == "like":
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
        else:
            # Star rating - update or create
            if existing:
                # Update existing rating
                feedback_table.update_rating_value(existing["id"], location_id, rating)
            else:
                # Create new rating
                feedback_id = str(uuid4())
                feedback_table.create({
                    "id": feedback_id,
                    "locationId": location_id,
                    "userId": user["id"],
                    "type": "star",
                    "rating": rating,
                    "createdAt": datetime.utcnow().isoformat() + "Z",
                })
                locations_table.increment_feedback_count(location_id)

            # Recalculate average rating
            new_avg = feedback_table.calculate_average_rating(location_id)
            locations_table.update_rating(location_id, new_avg)

            return success_response(
                data={"locationId": location_id, "rating": rating},
                message="Rating submitted!",
                status_code=201,
            )

    except Exception as e:
        print(f"Error submitting feedback: {str(e)}")
        return internal_error()
