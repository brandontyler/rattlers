"""
Lambda function to create a new route.

POST /routes
"""

import json
import os
from uuid import uuid4
from datetime import datetime
from typing import Dict, Any, List
import boto3

from auth import require_auth, get_user_info
from responses import success_response, error_response, validation_error, internal_error
from db import RoutesTable, LocationsTable


dynamodb = boto3.resource("dynamodb")


def calculate_route_stats(location_ids: List[str], locations_table: LocationsTable) -> Dict[str, Any]:
    """Calculate route statistics based on locations."""
    if not location_ids:
        return {"stopCount": 0, "estimatedMinutes": 0, "totalMiles": 0}

    locations = []
    for loc_id in location_ids:
        loc = locations_table.get(loc_id)
        if loc:
            locations.append(loc)

    stop_count = len(locations)

    # Estimate 10 minutes per stop viewing time
    viewing_time = stop_count * 10

    # Calculate driving distance if we have coordinates
    total_miles = 0.0
    if len(locations) >= 2:
        for i in range(len(locations) - 1):
            loc1 = locations[i]
            loc2 = locations[i + 1]
            if all(key in loc1 for key in ['lat', 'lng']) and all(key in loc2 for key in ['lat', 'lng']):
                # Haversine formula for distance
                import math
                R = 3959  # Earth's radius in miles
                lat1, lng1 = math.radians(loc1['lat']), math.radians(loc1['lng'])
                lat2, lng2 = math.radians(loc2['lat']), math.radians(loc2['lng'])
                dlat = lat2 - lat1
                dlng = lng2 - lng1
                a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
                c = 2 * math.asin(math.sqrt(a))
                total_miles += R * c

    # Estimate 2 minutes per mile for driving
    driving_time = int(total_miles * 2)
    estimated_minutes = viewing_time + driving_time

    return {
        "stopCount": stop_count,
        "estimatedMinutes": estimated_minutes,
        "totalMiles": round(total_miles, 1),
    }


def get_username(user_id: str) -> str:
    """Get username from users table."""
    users_table_name = os.environ.get("USERS_TABLE_NAME")
    if not users_table_name:
        return None

    users_table = dynamodb.Table(users_table_name)
    try:
        response = users_table.get_item(Key={"userId": user_id})
        user = response.get("Item", {})
        return user.get("username")
    except Exception as e:
        print(f"Error getting username: {e}")
        return None


@require_auth
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle POST /routes request."""
    try:
        user = get_user_info(event)

        # Parse request body
        try:
            body = json.loads(event.get("body") or "{}")
        except json.JSONDecodeError:
            return validation_error({"body": "Invalid JSON"})

        # Validate required fields
        title = body.get("title", "").strip()
        if not title:
            return validation_error({"title": "Title is required"})
        if len(title) > 100:
            return validation_error({"title": "Title must be 100 characters or less"})

        location_ids = body.get("locationIds", [])
        if not location_ids:
            return validation_error({"locationIds": "At least one location is required"})
        if len(location_ids) > 20:
            return validation_error({"locationIds": "Maximum 20 stops per route"})

        description = body.get("description", "").strip()
        if len(description) > 500:
            return validation_error({"description": "Description must be 500 characters or less"})

        tags = body.get("tags", [])
        if len(tags) > 10:
            return validation_error({"tags": "Maximum 10 tags per route"})

        is_public = body.get("isPublic", True)

        # Calculate route stats
        locations_table = LocationsTable()
        stats = calculate_route_stats(location_ids, locations_table)

        # Get username
        username = get_username(user["id"])

        # Create route
        route_id = str(uuid4())
        now = datetime.utcnow().isoformat() + "Z"

        route = {
            "id": route_id,
            "title": title,
            "description": description,
            "locationIds": location_ids,
            "tags": tags,
            "createdBy": user["id"],
            "createdByUsername": username,
            "createdAt": now,
            "updatedAt": now,
            "status": "active" if is_public else "draft",
            "likeCount": 0,
            "saveCount": 0,
            "startCount": 0,
            **stats,
        }

        routes_table = RoutesTable()
        routes_table.create(route)

        return success_response(
            data=route,
            message="Route created successfully!",
            status_code=201,
        )

    except Exception as e:
        print(f"Error creating route: {str(e)}")
        import traceback
        traceback.print_exc()
        return internal_error()
