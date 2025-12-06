"""Toggle favorite status for a location."""

from datetime import datetime
from typing import Dict, Any
from auth import require_auth, get_user_info
from responses import success_response, validation_error, not_found_error, internal_error
from db import LocationsTable, FeedbackTable


@require_auth
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle POST /locations/{id}/favorite request."""
    try:
        user = get_user_info(event)
        location_id = event.get("pathParameters", {}).get("id")

        if not location_id:
            return validation_error({"id": "Location ID is required"})

        # Check location exists
        locations_table = LocationsTable()
        location = locations_table.get(location_id)
        if not location:
            return not_found_error("Location not found")

        feedback_table = FeedbackTable()
        existing = feedback_table.get_user_feedback(location_id, user["id"], "favorite")

        if existing:
            # Remove favorite
            feedback_table.delete(existing["id"], location_id)
            return success_response(
                data={"favorited": False, "locationId": location_id},
                message="Removed from favorites",
            )
        else:
            # Add favorite
            feedback_id = f"favorite-{user['id']}-{location_id}"
            feedback_data = {
                "id": feedback_id,
                "locationId": location_id,
                "userId": user["id"],
                "type": "favorite",
                "createdAt": datetime.utcnow().isoformat() + "Z",
            }

            success, error_code = feedback_table.create_feedback_atomic(feedback_data)

            if success:
                return success_response(
                    data={"favorited": True, "locationId": location_id},
                    message="Added to favorites!",
                    status_code=201,
                )
            elif error_code == "ConditionalCheckFailedException":
                return success_response(
                    data={"favorited": True, "locationId": location_id},
                    message="Already in favorites",
                )
            else:
                return internal_error()

    except Exception as e:
        print(f"Error toggling favorite: {str(e)}")
        return internal_error()
