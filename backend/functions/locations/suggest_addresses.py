"""
Lambda function to suggest addresses based on partial input and geocode them.

POST /locations/suggest-addresses
Body: {"query": "123 Main St, Dallas"}
"""

import json
from typing import Dict, Any, List
from responses import success_response, error_response, internal_error

try:
    from geopy.geocoders import Nominatim
    from geopy.exc import GeocoderTimedOut, GeocoderServiceError
except ImportError:
    print("ERROR: geopy not available in Lambda layer")


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

        # Add North Texas context if not present
        search_query = query
        if 'TX' not in query.upper() and 'TEXAS' not in query.upper():
            search_query = f"{query}, North Texas"

        # Initialize geocoder
        geocoder = Nominatim(
            user_agent="dfw-christmas-lights-finder",
            timeout=5
        )

        # Get suggestions from geocoder
        suggestions = []

        try:
            # Use geocode to get multiple results
            # For Nominatim, we can use exactly_one=False to get multiple results
            locations = geocoder.geocode(
                search_query,
                exactly_one=False,
                limit=5,
                addressdetails=True
            )

            if locations:
                for location in locations:
                    # Extract relevant address information
                    address = location.address

                    # Filter to North Texas area (expanded to include surrounding cities)
                    # Includes: Dallas, Fort Worth, Denton, McKinney, Plano, Frisco, Arlington
                    # Also: Gainesville, Sherman, Denison, Waxahachie, Weatherford, Greenville
                    lat = location.latitude
                    lng = location.longitude

                    # North Texas bounds: roughly from Waxahachie to Sherman/Gainesville
                    # Lat 31.5-34.0 covers south suburbs to northern cities
                    # Lng -98.5 to -95.5 covers Weatherford west to Greenville east
                    if 31.5 <= lat <= 34.0 and -98.5 <= lng <= -95.5:
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

        # Return suggestions
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
