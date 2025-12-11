"""
Lambda function to get routes leaderboard.

GET /leaderboard/routes
- Returns top routes by likes
- Also returns top route creators
"""

import os
from typing import Dict, Any, List
from collections import defaultdict
import boto3

from responses import success_response, internal_error
from db import RoutesTable


dynamodb = boto3.resource("dynamodb")


def get_route_creator_badge(route_count: int) -> Dict[str, Any]:
    """Get badge based on number of routes created.

    Badge thresholds:
    - Route Scout: 1 route
    - Trail Blazer: 3 routes
    - Route Master: 5 routes
    - Legend: 10+ routes
    """
    badges = [
        {"type": "legend", "threshold": 10, "label": "Legend"},
        {"type": "route-master", "threshold": 5, "label": "Route Master"},
        {"type": "trail-blazer", "threshold": 3, "label": "Trail Blazer"},
        {"type": "route-scout", "threshold": 1, "label": "Route Scout"},
    ]

    for badge in badges:
        if route_count >= badge["threshold"]:
            return {
                "type": badge["type"],
                "label": badge["label"],
            }

    return None


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle GET /leaderboard/routes request."""
    try:
        # Parse query parameters
        params = event.get("queryStringParameters") or {}
        limit = min(int(params.get("limit", "20")), 50)

        # Get top routes by likes
        routes_table = RoutesTable()
        top_routes = routes_table.list_public(sort_by="popular", limit=limit)

        # Get usernames for route creators
        users_table_name = os.environ.get("USERS_TABLE_NAME")
        user_cache = {}

        if users_table_name:
            users_table = dynamodb.Table(users_table_name)

            for route in top_routes:
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

        # Calculate top route creators
        creator_stats = defaultdict(lambda: {"routeCount": 0, "totalLikes": 0, "totalSaves": 0})

        # We need all routes to calculate creator stats
        all_routes = routes_table.list_public(sort_by="new", limit=500)

        for route in all_routes:
            creator_id = route.get("createdBy")
            if creator_id:
                creator_stats[creator_id]["routeCount"] += 1
                creator_stats[creator_id]["totalLikes"] += route.get("likeCount", 0)
                creator_stats[creator_id]["totalSaves"] += route.get("saveCount", 0)

        # Build creator leaderboard
        creators = []
        for creator_id, stats in creator_stats.items():
            username = user_cache.get(creator_id)
            if not username and users_table_name:
                try:
                    users_table = dynamodb.Table(users_table_name)
                    response = users_table.get_item(Key={"userId": creator_id})
                    user_item = response.get("Item", {})
                    username = user_item.get("username")
                    user_cache[creator_id] = username
                except Exception:
                    pass

            creators.append({
                "userId": creator_id,
                "username": username or f"Creator-{creator_id[:8]}",
                "routeCount": stats["routeCount"],
                "totalLikes": stats["totalLikes"],
                "totalSaves": stats["totalSaves"],
                "badge": get_route_creator_badge(stats["routeCount"]),
            })

        # Sort by total likes, then by route count
        creators.sort(key=lambda x: (x["totalLikes"], x["routeCount"]), reverse=True)

        # Add ranks
        for i, creator in enumerate(creators[:20], 1):
            creator["rank"] = i

        return success_response(data={
            "routes": top_routes,
            "creators": creators[:20],
        })

    except Exception as e:
        print(f"Error getting routes leaderboard: {str(e)}")
        import traceback
        traceback.print_exc()
        return internal_error()
