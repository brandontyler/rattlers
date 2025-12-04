"""
Lambda function to suggest addresses based on partial input and geocode them.

POST /locations/suggest-addresses
Body: {"query": "123 Main St, Dallas"}
"""

import json
import time
from typing import Dict, Any, List
from responses import success_response, error_response, internal_error

try:
    from geopy.geocoders import Nominatim
    from geopy.exc import GeocoderTimedOut, GeocoderServiceError
    GEOPY_AVAILABLE = True
except ImportError:
    print("ERROR: geopy not available in Lambda layer")
    GEOPY_AVAILABLE = False


def geocode_with_retry(geocoder, query: str, max_retries: int = 2) -> list:
    """Attempt geocoding with retries on timeout."""
    for attempt in range(max_retries + 1):
        try:
            return geocoder.geocode(
                query,
                exactly_one=False,
                limit=5,
                addressdetails=True
            )
        except GeocoderTimedOut:
            if attempt < max_retries:
                time.sleep(0.5)  # Brief pause before retry
                continue
            raise
    return None


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle POST /locations/suggest-addresses request."""
    if not GEOPY_AVAILABLE:
        return error_response(
            code="SERVICE_UNAVAILABLE",
            message="Geocoding service not configured",
            status_code=503,
        )

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

        # Add Texas context if not present (Nominatim needs specific location)
        search_query = query
        if 'TX' not in query.upper() and 'TEXAS' not in query.upper():
            search_query = f"{query}, Texas, USA"

        # Initialize geocoder with longer timeout
        geocoder = Nominatim(
            user_agent="dfw-christmas-lights-finder",
            timeout=10
        )

        # Get suggestions from geocoder
        suggestions = []

        try:
            locations = geocode_with_retry(geocoder, search_query)

            if locations:
                for location in locations:
                    address = location.address
                    lat = location.latitude
                    lng = location.longitude

                    # North Texas bounds
                    if 31.5 <= lat <= 34.2 and -98.5 <= lng <= -95.5:
                        suggestions.append({
                            "address": address,
                            "lat": lat,
                            "lng": lng,
                            "displayName": address,
                        })

        except GeocoderTimedOut:
            return error_response(
                code="GEOCODER_TIMEOUT",
                message="Geocoding service timed out. Please try again.",
                status_code=503,
            )
        except GeocoderServiceError as e:
            print(f"Geocoder service error: {str(e)}")
            return error_response(
                code="GEOCODER_ERROR",
                message="Geocoding service is temporarily unavailable",
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
