"""
Lambda function to create a new location (admin only).

POST /locations
"""

import json
from datetime import datetime
from typing import Dict, Any
from responses import success_response, validation_error, internal_error
from db import LocationsTable
from models import Location, LocationStatus
from auth import require_admin, get_user_info
from pydantic import ValidationError


@require_admin
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle POST /locations request."""
    try:
        # Parse request body
        body = json.loads(event.get("body", "{}"))

        # Get user info from auth decorator
        user = get_user_info(event)

        # TODO: Geocode address to get lat/lng
        # For now, require lat/lng in request
        if "lat" not in body or "lng" not in body:
            return validation_error({
                "coordinates": "Latitude and longitude are required. Geocoding will be added in future update."
            })

        # Create location model
        try:
            location = Location(
                address=body.get("address"),
                lat=body["lat"],
                lng=body["lng"],
                description=body.get("description", ""),
                photos=body.get("photos", []),
                created_by=user.get("id"),
            )
        except ValidationError as e:
            errors = {}
            for error in e.errors():
                field = ".".join(str(loc) for loc in error["loc"])
                errors[field] = error["msg"]
            return validation_error(errors)

        # Save to database
        locations_table = LocationsTable()
        created = locations_table.create(location.model_dump(by_alias=True))

        # Clean up DynamoDB metadata
        created.pop("PK", None)
        created.pop("SK", None)

        return success_response(
            data=created,
            message="Location created successfully",
            status_code=201,
        )

    except json.JSONDecodeError:
        return validation_error({"body": "Invalid JSON in request body"})
    except Exception as e:
        print(f"Error creating location: {str(e)}")
        return internal_error()
