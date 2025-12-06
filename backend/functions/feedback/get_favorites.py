"""Get user's favorite locations."""

from typing import Dict, Any
from auth import require_auth, get_user_info
from responses import success_response, internal_error
from db import LocationsTable, FeedbackTable


@require_auth
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle GET /users/favorites request."""
    try:
        user = get_user_info(event)
        feedback_table = FeedbackTable()
        locations_table = LocationsTable()

        # Get all favorites for user
        favorites = feedback_table.get_user_favorites(user["id"])

        # Fetch location details for each favorite
        locations = []
        for fav in favorites:
            location = locations_table.get(fav["locationId"])
            if location and location.get("status") == "active":
                locations.append({
                    **location,
                    "favoritedAt": fav.get("createdAt"),
                })

        return success_response(data=locations)

    except Exception as e:
        print(f"Error getting favorites: {str(e)}")
        return internal_error()
