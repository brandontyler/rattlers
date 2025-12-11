"""
Lambda function to get leaderboard of top locations by likes.
GET /leaderboard/locations
"""

import os
from typing import Dict, Any
from responses import success_response, internal_error
from db import LocationsTable


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle GET /leaderboard/locations request.

    Returns top locations ranked by like count.
    """
    try:
        locations_table = LocationsTable()
        all_locations = locations_table.list_all(status="active")

        # Sort by likeCount descending
        sorted_locations = sorted(
            all_locations,
            key=lambda x: x.get("likeCount", 0),
            reverse=True
        )

        # Take top 50
        top_locations = sorted_locations[:50]

        # Build leaderboard entries
        leaderboard = []
        for i, loc in enumerate(top_locations, 1):
            entry = {
                "rank": i,
                "locationId": loc.get("id"),
                "address": loc.get("address"),
                "description": loc.get("description"),
                "aiDescription": loc.get("aiDescription"),
                "likeCount": loc.get("likeCount", 0),
                "photos": loc.get("photos", [])[:1],  # First photo only
                "createdBy": loc.get("createdBy"),
                "createdByUsername": loc.get("createdByUsername"),
                "decorations": loc.get("decorations", []),
                "displayQuality": loc.get("displayQuality"),
            }
            leaderboard.append(entry)

        return success_response(data=leaderboard)

    except Exception as e:
        print(f"Error getting locations leaderboard: {str(e)}")
        import traceback
        traceback.print_exc()
        return internal_error()
