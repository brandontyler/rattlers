"""
Lambda function to list routes.

GET /routes
- Query params: sort (popular|new), limit
"""

import os
from typing import Dict, Any, List
import boto3

from responses import success_response, internal_error
from db import RoutesTable


dynamodb = boto3.resource("dynamodb")


def get_allowed_origins() -> list:
    origins_str = os.environ.get("ALLOWED_ORIGINS", "")
    if origins_str:
        return [o.strip() for o in origins_str.split(",") if o.strip()]
    single = os.environ.get("ALLOWED_ORIGIN", "")
    return [single] if single else ["*"]


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle GET /routes request."""
    try:
        # Parse query parameters
        params = event.get("queryStringParameters") or {}
        sort_by = params.get("sort", "popular")  # popular or new
        limit = min(int(params.get("limit", "50")), 100)

        if sort_by not in ["popular", "new"]:
            sort_by = "popular"

        # Get routes
        routes_table = RoutesTable()
        routes = routes_table.list_public(sort_by=sort_by, limit=limit)

        # Enrich with creator info if needed
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
                            user = response.get("Item", {})
                            user_cache[creator_id] = user.get("username")
                        except Exception:
                            user_cache[creator_id] = None

                    route["createdByUsername"] = user_cache.get(creator_id)

        return success_response(data=routes)

    except Exception as e:
        print(f"Error getting routes: {str(e)}")
        import traceback
        traceback.print_exc()
        return internal_error()
