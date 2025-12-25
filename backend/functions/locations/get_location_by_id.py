"""
Lambda function to get a specific location by ID.

GET /locations/{id}
"""

from typing import Dict, Any
from responses import success_response, not_found_error, internal_error
from db import LocationsTable


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle GET /locations/{id} request."""
    try:
        # Extract location ID from path parameters
        path_params = event.get("pathParameters") or {}
        location_id = path_params.get("id")

        print(f"GET /locations/{location_id} - pathParameters: {path_params}")

        if not location_id:
            print("ERROR: No location ID provided")
            return not_found_error("Location ID is required")

        # Get location from database
        locations_table = LocationsTable()
        print(f"Looking up location with PK=location#{location_id}, SK=metadata")
        location = locations_table.get(location_id)

        if not location:
            print(f"ERROR: Location not found for ID: {location_id}")
            return not_found_error(f"Location with ID {location_id} not found")

        # Clean up DynamoDB metadata
        location.pop("PK", None)
        location.pop("SK", None)

        # Increment view count (view analytics)
        locations_table.increment_view_count(location_id)

        return success_response(data=location)

    except Exception as e:
        print(f"Error getting location: {str(e)}")
        return internal_error()
