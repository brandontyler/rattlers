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

        # Validate and parse parameters
        try:
            lat = float(params.get("lat")) if params.get("lat") else None
            lng = float(params.get("lng")) if params.get("lng") else None
            radius = float(params.get("radius", 10))
            search = params.get("search", "").strip().lower()
            status = params.get("status", "active")
            min_rating = float(params.get("minRating", 0))
            page = int(params.get("page", 1))
            page_size = int(params.get("pageSize", 50))

            # Validate bounds
            if radius < 0 or radius > 100:
                return error_response(
                    code="VALIDATION_ERROR",
                    message="Radius must be between 0 and 100 miles",
                    status_code=400,
                )

            if min_rating < 0 or min_rating > 5:
                return error_response(
                    code="VALIDATION_ERROR",
                    message="Rating must be between 0 and 5",
                    status_code=400,
                )

            if page < 1:
                page = 1

            if page_size < 1:
                page_size = 50
            elif page_size > 500:  # Allow up to 500 for map view
                page_size = 500

            if lat is not None and (lat < -90 or lat > 90):
                return error_response(
                    code="VALIDATION_ERROR",
                    message="Latitude must be between -90 and 90",
                    status_code=400,
                )

            if lng is not None and (lng < -180 or lng > 180):
                return error_response(
                    code="VALIDATION_ERROR",
                    message="Longitude must be between -180 and 180",
                    status_code=400,
                )

        except (ValueError, TypeError) as e:
            return error_response(
                code="VALIDATION_ERROR",
                message=f"Invalid parameter format: {str(e)}",
                status_code=400,
            )

        # Get locations from database
        locations_table = LocationsTable()
        all_locations = locations_table.list_all(status=status)

        # Apply filters
        filtered_locations = all_locations

        # Search filter (searches address, description, decorations)
        if search:
            filtered_locations = [
                loc for loc in filtered_locations
                if search in loc.get("address", "").lower()
                or search in loc.get("description", "").lower()
                or search in loc.get("aiDescription", "").lower()
                or any(search in dec.lower() for dec in loc.get("decorations", []))
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
