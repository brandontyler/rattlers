"""
Lambda function to update a route.

PUT /routes/{id}
- Only the route owner can update
"""

import json
import os
from datetime import datetime
from typing import Dict, Any, List
import math
import boto3

from auth import require_auth, get_user_info
from responses import success_response, error_response, validation_error, not_found_error, internal_error
from db import RoutesTable, LocationsTable


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
    viewing_time = stop_count * 10

    total_miles = 0.0
    if len(locations) >= 2:
        for i in range(len(locations) - 1):
            loc1 = locations[i]
            loc2 = locations[i + 1]
            if all(key in loc1 for key in ['lat', 'lng']) and all(key in loc2 for key in ['lat', 'lng']):
                R = 3959
                lat1, lng1 = math.radians(loc1['lat']), math.radians(loc1['lng'])
                lat2, lng2 = math.radians(loc2['lat']), math.radians(loc2['lng'])
                dlat = lat2 - lat1
                dlng = lng2 - lng1
                a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
                c = 2 * math.asin(math.sqrt(a))
                total_miles += R * c

    driving_time = int(total_miles * 2)
    estimated_minutes = viewing_time + driving_time

    return {
        "stopCount": stop_count,
        "estimatedMinutes": estimated_minutes,
        "totalMiles": round(total_miles, 1),
    }


@require_auth
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle PUT /routes/{id} request."""
    try:
        user = get_user_info(event)
        route_id = event.get("pathParameters", {}).get("id")

        if not route_id:
            return validation_error({"id": "Route ID is required"})

        # Get existing route
        routes_table = RoutesTable()
        route = routes_table.get(route_id)

        if not route:
            return not_found_error("Route not found")

        # Check ownership
        if route.get("createdBy") != user["id"]:
            return error_response(
                message="You can only update your own routes",
                status_code=403,
            )

        # Parse request body
        try:
            body = json.loads(event.get("body") or "{}")
        except json.JSONDecodeError:
            return validation_error({"body": "Invalid JSON"})

        updates = {}

        # Validate and apply updates
        if "title" in body:
            title = body["title"].strip()
            if not title:
                return validation_error({"title": "Title cannot be empty"})
            if len(title) > 100:
                return validation_error({"title": "Title must be 100 characters or less"})
            updates["title"] = title

        if "description" in body:
            description = body["description"].strip()
            if len(description) > 500:
                return validation_error({"description": "Description must be 500 characters or less"})
            updates["description"] = description

        if "tags" in body:
            tags = body["tags"]
            if len(tags) > 10:
                return validation_error({"tags": "Maximum 10 tags per route"})
            updates["tags"] = tags

        if "locationIds" in body:
            location_ids = body["locationIds"]
            if not location_ids:
                return validation_error({"locationIds": "At least one location is required"})
            if len(location_ids) > 20:
                return validation_error({"locationIds": "Maximum 20 stops per route"})
            updates["locationIds"] = location_ids

            # Recalculate stats
            locations_table = LocationsTable()
            stats = calculate_route_stats(location_ids, locations_table)
            updates.update(stats)

        if "isPublic" in body:
            is_public = body["isPublic"]
            updates["status"] = "active" if is_public else "draft"

        if not updates:
            return validation_error({"body": "No valid updates provided"})

        # Add updated timestamp
        updates["updatedAt"] = datetime.utcnow().isoformat() + "Z"

        # Update route
        updated_route = routes_table.update(route_id, updates)

        return success_response(
            data=updated_route,
            message="Route updated successfully",
        )

    except Exception as e:
        print(f"Error updating route: {str(e)}")
        import traceback
        traceback.print_exc()
        return internal_error()
