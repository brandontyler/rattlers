"""
Lambda function to report a location as inactive.

POST /locations/{id}/report
"""

import json
from typing import Dict, Any
from auth import require_auth, get_user_info
from responses import success_response, error_response, validation_error, not_found_error, internal_error
from db import LocationsTable

# Number of reports before flagging
REPORT_THRESHOLD = 3


@require_auth
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle POST /locations/{id}/report request."""
    try:
        user = get_user_info(event)
        location_id = event.get("pathParameters", {}).get("id")

        if not location_id:
            return validation_error({"id": "Location ID is required"})

        # Parse request body (optional reason)
        try:
            body = json.loads(event.get("body") or "{}")
        except json.JSONDecodeError:
            body = {}

        reason = body.get("reason", "No lights visible")

        # Check location exists
        locations_table = LocationsTable()
        location = locations_table.get(location_id)

        if not location:
            return not_found_error("Location not found")

        # Increment report count and get new count
        new_count = locations_table.increment_report_count(location_id)

        # Flag location if threshold reached
        flagged = False
        if new_count >= REPORT_THRESHOLD and location.get("status") == "active":
            locations_table.update(location_id, {"status": "flagged"})
            flagged = True

        return success_response(
            message="Report submitted. Thank you for helping keep our data accurate!",
            data={
                "reportCount": new_count,
                "flagged": flagged,
            },
        )

    except Exception as e:
        print(f"Error reporting location: {str(e)}")
        return internal_error()
