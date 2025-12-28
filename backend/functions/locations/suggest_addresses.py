"""
Lambda function to suggest addresses using AWS Location Service.

POST /locations/suggest-addresses
Body: {"query": "123 Main St, Dallas"}

Uses SearchPlaceIndexForSuggestions for real-time autocomplete.
"""

import json
import os
from typing import Dict, Any
import boto3
from botocore.exceptions import ClientError
from responses import success_response, error_response, internal_error


# Initialize Location Service client
location_client = boto3.client("location")
PLACE_INDEX_NAME = os.environ.get("PLACE_INDEX_NAME", "christmas-lights-places-dev")

# North Texas center for biasing results (Dallas)
NORTH_TEXAS_BIAS = {
    "lat": 32.7767,
    "lng": -96.7970,
}

# Filter box for North Texas (wider area to catch suburbs)
NORTH_TEXAS_FILTER = {
    "min_lat": 31.5,
    "max_lat": 34.2,
    "min_lng": -98.5,
    "max_lng": -95.5,
}


def format_suggestion(result: Dict) -> Dict:
    """Format AWS Location Service result into our suggestion format."""
    # Get text from the suggestion
    text = result.get("Text", "")
    place_id = result.get("PlaceId")

    return {
        "address": text,
        "lat": None,
        "lng": None,
        "displayName": text,
        "placeId": place_id,
    }


def format_place(place: Dict) -> Dict:
    """Format a Place result with full details including coordinates."""
    geometry = place.get("Geometry", {})
    point = geometry.get("Point", [])

    if len(point) >= 2:
        lng, lat = point[0], point[1]
    else:
        lat, lng = None, None

    # Build display name from address components
    address_parts = []
    if place.get("AddressNumber"):
        address_parts.append(place["AddressNumber"])
    if place.get("Street"):
        if address_parts:
            address_parts[0] += f" {place['Street']}"
        else:
            address_parts.append(place["Street"])
    if place.get("Municipality"):
        address_parts.append(place["Municipality"])
    if place.get("Region"):
        address_parts.append(place["Region"])

    display_name = ", ".join(address_parts) if address_parts else place.get("Label", "")

    return {
        "address": display_name,
        "lat": lat,
        "lng": lng,
        "displayName": display_name,
    }


def is_in_north_texas(lat: float, lng: float) -> bool:
    """Check if coordinates are within North Texas bounds."""
    if lat is None or lng is None:
        return True  # Include if no coordinates
    return (
        NORTH_TEXAS_FILTER["min_lat"] <= lat <= NORTH_TEXAS_FILTER["max_lat"]
        and NORTH_TEXAS_FILTER["min_lng"] <= lng <= NORTH_TEXAS_FILTER["max_lng"]
    )


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle POST /locations/suggest-addresses request."""
    try:
        # Parse request body
        try:
            body = json.loads(event.get("body", "{}"))
        except json.JSONDecodeError:
            return error_response(
                code="INVALID_JSON",
                message="Invalid JSON in request body",
                status_code=400,
            )

        # Get query parameter
        query = body.get("query", "").strip()

        if not query:
            return error_response(
                code="VALIDATION_ERROR",
                message="Query parameter is required",
                status_code=400,
            )

        if len(query) < 3:
            return error_response(
                code="VALIDATION_ERROR",
                message="Query must be at least 3 characters",
                status_code=400,
            )

        suggestions = []

        try:
            # Use SearchPlaceIndexForSuggestions for autocomplete
            response = location_client.search_place_index_for_suggestions(
                IndexName=PLACE_INDEX_NAME,
                Text=query,
                MaxResults=7,
                BiasPosition=[NORTH_TEXAS_BIAS["lng"], NORTH_TEXAS_BIAS["lat"]],
                FilterCountries=["USA"],
            )

            # Get PlaceIds from suggestions
            suggestion_results = response.get("Results", [])

            # For each suggestion with a PlaceId, get the full place details
            for result in suggestion_results:
                place_id = result.get("PlaceId")
                if place_id:
                    try:
                        # Get full place details including coordinates
                        place_response = location_client.get_place(
                            IndexName=PLACE_INDEX_NAME,
                            PlaceId=place_id,
                        )
                        place = place_response.get("Place", {})
                        suggestion = format_place(place)

                        # Filter to North Texas area
                        if is_in_north_texas(suggestion["lat"], suggestion["lng"]):
                            suggestions.append(suggestion)
                    except ClientError as e:
                        print(f"Error getting place {place_id}: {e}")
                        # Fall back to suggestion text without coordinates
                        suggestions.append(format_suggestion(result))
                else:
                    # No PlaceId, just use the text
                    suggestions.append(format_suggestion(result))

            # Remove any internal fields and duplicates
            seen_addresses = set()
            unique_suggestions = []
            for suggestion in suggestions:
                suggestion.pop("placeId", None)
                addr = suggestion["address"].lower()
                if addr not in seen_addresses:
                    seen_addresses.add(addr)
                    unique_suggestions.append(suggestion)

            suggestions = unique_suggestions

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            print(f"AWS Location Service error: {error_code} - {str(e)}")

            if error_code == "ResourceNotFoundException":
                return error_response(
                    code="SERVICE_NOT_CONFIGURED",
                    message="Address lookup service is not configured",
                    status_code=503,
                )
            elif error_code == "AccessDeniedException":
                return error_response(
                    code="SERVICE_ERROR",
                    message="Address lookup service access denied",
                    status_code=503,
                )
            else:
                return error_response(
                    code="GEOCODER_ERROR",
                    message="Address lookup service is temporarily unavailable",
                    status_code=503,
                )

        return success_response(
            data={
                "suggestions": suggestions,
                "query": query,
            }
        )

    except Exception as e:
        print(f"Error suggesting addresses: {str(e)}")
        import traceback
        traceback.print_exc()
        return internal_error()
