"""Lambda function to check for duplicate locations before submission."""

import json
import os
from decimal import Decimal

import boto3

dynamodb = boto3.resource("dynamodb")
locations_table = dynamodb.Table(os.environ.get("LOCATIONS_TABLE_NAME", "christmas-lights-locations-dev"))
suggestions_table = dynamodb.Table(os.environ.get("SUGGESTIONS_TABLE_NAME", "christmas-lights-suggestions-dev"))

PHOTOS_CDN_URL = os.environ.get("PHOTOS_CDN_URL", "")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}


class DecimalEncoder(json.JSONEncoder):
    """JSON encoder that handles Decimal types."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def round_coordinate(coord, decimals=4):
    """Round coordinate to specified decimal places for matching.

    4 decimal places = ~11 meter accuracy, good for matching same house.
    """
    try:
        return round(float(coord), decimals)
    except (TypeError, ValueError):
        return None


def normalize_address(address):
    """Normalize address for comparison.

    - Lowercase
    - Remove extra whitespace
    - Basic standardization
    """
    if not address:
        return ""

    # Lowercase and strip
    normalized = address.lower().strip()

    # Remove extra whitespace
    normalized = " ".join(normalized.split())

    return normalized


def check_locations_table(lat_rounded, lng_rounded, address_normalized):
    """Check approved locations for duplicates."""

    try:
        # Scan locations table - in production with many locations,
        # would want a GSI on rounded coordinates
        response = locations_table.scan(
            FilterExpression="SK = :sk AND #status = :status",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":sk": "metadata",
                ":status": "active",
            },
        )

        for item in response.get("Items", []):
            item_lat = round_coordinate(item.get("lat"))
            item_lng = round_coordinate(item.get("lng"))

            # Check coordinate match (primary method)
            if item_lat == lat_rounded and item_lng == lng_rounded:
                return item

            # Check normalized address match (backup method)
            item_address = normalize_address(item.get("address", ""))
            if item_address and item_address == address_normalized:
                return item

        return None

    except Exception as e:
        print(f"Error checking locations table: {e}")
        return None


def check_suggestions_table(lat_rounded, lng_rounded, address_normalized):
    """Check pending suggestions for duplicates."""

    try:
        response = suggestions_table.scan(
            FilterExpression="SK = :sk AND #status = :status AND #type = :type",
            ExpressionAttributeNames={"#status": "status", "#type": "type"},
            ExpressionAttributeValues={
                ":sk": "METADATA",
                ":status": "pending",
                ":type": "new_location",
            },
        )

        for item in response.get("Items", []):
            item_lat = round_coordinate(item.get("lat"))
            item_lng = round_coordinate(item.get("lng"))

            # Check coordinate match
            if item_lat == lat_rounded and item_lng == lng_rounded:
                return True

            # Check normalized address match
            item_address = normalize_address(item.get("address", ""))
            if item_address and item_address == address_normalized:
                return True

        return False

    except Exception as e:
        print(f"Error checking suggestions table: {e}")
        return False


def handler(event, context):
    """Handle POST /locations/check-duplicate request.

    Checks if a location already exists based on coordinates and address.
    Returns the existing location if found, so user can add photos instead.
    """

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        body = json.loads(event.get("body", "{}"))
        lat = body.get("lat")
        lng = body.get("lng")
        address = body.get("address", "")

        # Validate input
        if lat is None or lng is None:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "lat and lng are required"}),
            }

        # Round coordinates for matching
        lat_rounded = round_coordinate(lat)
        lng_rounded = round_coordinate(lng)
        address_normalized = normalize_address(address)

        if lat_rounded is None or lng_rounded is None:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "Invalid coordinates"}),
            }

        # Check for existing approved location
        existing_location = check_locations_table(lat_rounded, lng_rounded, address_normalized)

        if existing_location:
            # Found a duplicate - return location details
            photos = existing_location.get("photos", [])

            location_data = {
                "id": existing_location.get("id"),
                "address": existing_location.get("address"),
                "description": existing_location.get("description"),
                "aiDescription": existing_location.get("aiDescription"),
                "photos": photos,
                "hasPhotos": len(photos) > 0,
                "likeCount": int(existing_location.get("likeCount", 0)),
                "displayQuality": existing_location.get("displayQuality"),
                "decorations": existing_location.get("decorations", []),
            }

            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({
                    "success": True,
                    "data": {
                        "isDuplicate": True,
                        "location": location_data,
                        "hasPendingSuggestion": False,
                    },
                }, cls=DecimalEncoder),
            }

        # Check for pending suggestion at same location
        has_pending = check_suggestions_table(lat_rounded, lng_rounded, address_normalized)

        if has_pending:
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({
                    "success": True,
                    "data": {
                        "isDuplicate": True,
                        "location": None,
                        "hasPendingSuggestion": True,
                    },
                }),
            }

        # No duplicate found
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "success": True,
                "data": {
                    "isDuplicate": False,
                    "location": None,
                    "hasPendingSuggestion": False,
                },
            }),
        }

    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Invalid JSON body"}),
        }
    except Exception as e:
        print(f"Error checking duplicate: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Failed to check for duplicates"}),
        }
