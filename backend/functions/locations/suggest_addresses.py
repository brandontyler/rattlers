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


def geocode_with_retry(geocoder, query: str, max_retries: int = 2, structured: bool = False) -> list:
    """Attempt geocoding with retries on timeout."""
    for attempt in range(max_retries + 1):
        try:
            if structured:
                # Try structured query for better accuracy
                return geocoder.geocode(
                    query,
                    exactly_one=False,
                    limit=5,
                    addressdetails=True,
                    featuretype='building'  # Prefer building-level results
                )
            else:
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


def format_address_for_display(location) -> str:
    """Format address properly from Nominatim response.

    Ensures we get a complete address with street number, street name, city, state.
    """
    raw = location.raw.get('address', {})

    # Build address from components
    parts = []

    # House number and street
    house_number = raw.get('house_number', '')
    road = raw.get('road', raw.get('street', ''))

    if house_number and road:
        parts.append(f"{house_number} {road}")
    elif road:
        parts.append(road)
    elif location.address:
        # Fallback to first part of full address
        first_part = location.address.split(',')[0].strip()
        parts.append(first_part)

    # City
    city = raw.get('city', raw.get('town', raw.get('village', raw.get('municipality', ''))))
    if city:
        parts.append(city)

    # State
    state = raw.get('state', '')
    if state:
        parts.append(state)

    # If we couldn't build a proper address, use the original
    if not parts or (len(parts) == 1 and not house_number):
        return location.address

    return ', '.join(parts)


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
            # First try with building featuretype for better house-level accuracy
            locations = geocode_with_retry(geocoder, search_query, structured=True)

            # If no building-level results, fall back to regular search
            if not locations:
                locations = geocode_with_retry(geocoder, search_query, structured=False)

            if locations:
                seen_coords = set()  # Avoid duplicate coordinates
                for location in locations:
                    lat = location.latitude
                    lng = location.longitude

                    # Round to 5 decimal places for deduplication (~1m accuracy)
                    coord_key = (round(lat, 5), round(lng, 5))
                    if coord_key in seen_coords:
                        continue
                    seen_coords.add(coord_key)

                    # North Texas bounds
                    if 31.5 <= lat <= 34.2 and -98.5 <= lng <= -95.5:
                        # Use improved address formatting
                        formatted_address = format_address_for_display(location)

                        suggestions.append({
                            "address": formatted_address,
                            "lat": lat,
                            "lng": lng,
                            "displayName": formatted_address,
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
