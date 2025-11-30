"""
Lambda function to get all locations with optional filtering.

GET /locations?lat=32.7767&lng=-96.797&radius=10&search=dallas&status=active&minRating=4
"""

import json
from typing import Dict, Any
from responses import success_response, error_response, internal_error
from db import LocationsTable


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle GET /locations request."""
    try:
        # Parse query parameters
        params = event.get("queryStringParameters") or {}

        lat = params.get("lat")
        lng = params.get("lng")
        radius = float(params.get("radius", 10))
        search = params.get("search", "").lower()
        status = params.get("status", "active")
        min_rating = float(params.get("minRating", 0))
        page = int(params.get("page", 1))
        page_size = min(int(params.get("pageSize", 50)), 100)

        # Get locations from database
        locations_table = LocationsTable()
        all_locations = locations_table.list_all(status=status)

        # Apply filters
        filtered_locations = all_locations

        # Search filter
        if search:
            filtered_locations = [
                loc for loc in filtered_locations
                if search in loc.get("address", "").lower()
                or search in loc.get("description", "").lower()
            ]

        # Rating filter
        if min_rating > 0:
            filtered_locations = [
                loc for loc in filtered_locations
                if loc.get("averageRating", 0) >= min_rating
            ]

        # TODO: Implement proximity search with lat/lng/radius
        # This would require geohashing or a geospatial index

        # Pagination
        total = len(filtered_locations)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_locations = filtered_locations[start_idx:end_idx]

        # Clean up DynamoDB metadata
        for loc in paginated_locations:
            loc.pop("PK", None)
            loc.pop("SK", None)

        return success_response(
            data=paginated_locations,
            pagination={
                "page": page,
                "pageSize": page_size,
                "total": total,
                "totalPages": (total + page_size - 1) // page_size,
            },
        )

    except ValueError as e:
        return error_response(
            code="VALIDATION_ERROR",
            message=str(e),
            status_code=400,
        )
    except Exception as e:
        print(f"Error getting locations: {str(e)}")
        return internal_error()
