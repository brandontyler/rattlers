"""
Lambda function to get routes saved by the current user.

GET /users/saved-routes
"""

import os
from typing import Dict, Any, List
import boto3

from auth import require_auth, get_user_info
from responses import success_response, internal_error
from db import RoutesTable, RouteFeedbackTable


dynamodb = boto3.resource("dynamodb")


@require_auth
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle GET /users/saved-routes request."""
    try:
        user = get_user_info(event)

        # Get route IDs that user has saved
        feedback_table = RouteFeedbackTable()
        saved_route_ids = feedback_table.get_user_saved_routes(user["id"])

        if not saved_route_ids:
            return success_response(data=[])

        # Get route details
        routes_table = RoutesTable()
        routes = []

        for route_id in saved_route_ids:
            route = routes_table.get(route_id)
            if route and route.get("status") == "active":
                routes.append(route)

        # Enrich with creator usernames
        users_table_name = os.environ.get("USERS_TABLE_NAME")
        if users_table_name:
            users_table = dynamodb.Table(users_table_name)
            user_cache = {}

            for route in routes:
                creator_id = route.get("createdBy")
                if creator_id and not route.get("createdByUsername"):
                    if creator_id not in user_cache:
                        try:
                            response = users_table.get_item(Key={"userId": creator_id})
                            user_item = response.get("Item", {})
                            user_cache[creator_id] = user_item.get("username")
                        except Exception:
                            user_cache[creator_id] = None

                    route["createdByUsername"] = user_cache.get(creator_id)

        # Sort by like count (most popular first)
        routes.sort(key=lambda r: r.get("likeCount", 0), reverse=True)

        return success_response(data=routes)

    except Exception as e:
        print(f"Error getting saved routes: {str(e)}")
        import traceback
        traceback.print_exc()
        return internal_error()
