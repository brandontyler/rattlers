"""
Lambda function to get a route by ID with full location details.

GET /routes/{id}
"""

import os
from typing import Dict, Any, List, Optional
import boto3

from responses import success_response, not_found_error, internal_error
from db import RoutesTable, LocationsTable, RouteFeedbackTable
from auth import get_user_info


dynamodb = boto3.resource("dynamodb")


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle GET /routes/{id} request."""
    try:
        route_id = event.get("pathParameters", {}).get("id")
        if not route_id:
            return not_found_error("Route ID is required")

        # Get route
        routes_table = RoutesTable()
        route = routes_table.get(route_id)

        if not route:
            return not_found_error("Route not found")

        # Check if route is public or user is the owner
        user = None
        try:
            user = get_user_info(event)
        except Exception:
            pass  # Unauthenticated request

        if route.get("status") == "draft":
            if not user or user["id"] != route.get("createdBy"):
                return not_found_error("Route not found")

        # Get full location details
        locations_table = LocationsTable()
        location_ids = route.get("locationIds", [])
        locations = []

        for loc_id in location_ids:
            loc = locations_table.get(loc_id)
            if loc:
                # Include only necessary fields
                locations.append({
                    "id": loc.get("id"),
                    "address": loc.get("address"),
                    "lat": loc.get("lat"),
                    "lng": loc.get("lng"),
                    "description": loc.get("description"),
                    "photos": loc.get("photos", []),
                    "likeCount": loc.get("likeCount", 0),
                    "displayQuality": loc.get("displayQuality"),
                    "categories": loc.get("categories", []),
                    "theme": loc.get("theme"),
                })

        route["locations"] = locations

        # Get creator username if not already present
        if not route.get("createdByUsername"):
            users_table_name = os.environ.get("USERS_TABLE_NAME")
            if users_table_name:
                users_table = dynamodb.Table(users_table_name)
                try:
                    response = users_table.get_item(Key={"userId": route.get("createdBy")})
                    user_item = response.get("Item", {})
                    route["createdByUsername"] = user_item.get("username")
                except Exception as e:
                    print(f"Error getting username: {e}")

        # Get user's feedback status if authenticated
        if user:
            feedback_table = RouteFeedbackTable()
            feedback_status = feedback_table.get_user_feedback_all_types(route_id, user["id"])
            route["userLiked"] = feedback_status["liked"]
            route["userSaved"] = feedback_status["saved"]

        # Increment start count (view analytics)
        routes_table.increment_start_count(route_id)

        return success_response(data=route)

    except Exception as e:
        print(f"Error getting route: {str(e)}")
        import traceback
        traceback.print_exc()
        return internal_error()
