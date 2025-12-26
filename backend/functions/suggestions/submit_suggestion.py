"""Lambda function to submit a new location suggestion or photo update."""

import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
lambda_client = boto3.client("lambda")
table = dynamodb.Table(os.environ.get("SUGGESTIONS_TABLE_NAME", "christmas-lights-suggestions-dev"))
locations_table = dynamodb.Table(os.environ.get("LOCATIONS_TABLE_NAME", "christmas-lights-locations-dev"))
ANALYZE_PHOTO_FUNCTION = os.environ.get("ANALYZE_PHOTO_FUNCTION_NAME", "")
PHOTOS_BUCKET = os.environ.get("PHOTOS_BUCKET_NAME", "")

ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}


def round_coordinate(coord, decimals=4):
    """Round coordinate to specified decimal places for matching.

    4 decimal places = ~11 meter accuracy, good for matching same house.
    """
    try:
        return round(float(coord), decimals)
    except (TypeError, ValueError):
        return None


def normalize_address(address):
    """Normalize address for comparison."""
    if not address:
        return ""
    normalized = address.lower().strip()
    normalized = " ".join(normalized.split())
    return normalized


def check_for_duplicate(lat, lng, address):
    """Check if a location already exists at these coordinates or address.

    Returns: (is_duplicate, message)
    """
    lat_rounded = round_coordinate(lat)
    lng_rounded = round_coordinate(lng)
    address_normalized = normalize_address(address)

    if lat_rounded is None or lng_rounded is None:
        return False, None

    # Check approved locations
    try:
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

            # Check coordinate match
            if item_lat == lat_rounded and item_lng == lng_rounded:
                return True, "This location already exists on the map"

            # Check normalized address match
            item_address = normalize_address(item.get("address", ""))
            if item_address and item_address == address_normalized:
                return True, "This address already exists on the map"

    except Exception as e:
        print(f"Error checking locations table: {e}")

    # Check pending suggestions
    try:
        response = table.scan(
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
                return True, "This location has already been submitted and is pending review"

            # Check normalized address match
            item_address = normalize_address(item.get("address", ""))
            if item_address and item_address == address_normalized:
                return True, "This address has already been submitted and is pending review"

    except Exception as e:
        print(f"Error checking suggestions table: {e}")

    return False, None


def validate_address_format(address):
    """Validate that address has proper format with street name.

    Returns: (is_valid, error_message)
    """
    if not address:
        return False, "Address is required"

    address = address.strip()

    # Must have at least a number and some text (e.g., "314 Magnolia")
    parts = address.split()
    if len(parts) < 2:
        return False, "Address must include street number and street name"

    # First part should contain a number (street number)
    first_part = parts[0]
    if not any(c.isdigit() for c in first_part):
        return False, "Address must start with a street number"

    # Should have more than just the number - need street name
    remaining = " ".join(parts[1:])
    if len(remaining) < 2:
        return False, "Address must include street name"

    # Check for alphabetic content in the remaining parts (street name)
    has_alpha = any(c.isalpha() for c in remaining)
    if not has_alpha:
        return False, "Address must include street name"

    return True, None


def handle_photo_update(body, user_id, user_email, target_location_id):
    """Handle photo submission for an existing location."""

    # Validate target location ID
    if not target_location_id:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Target location ID is required for photo updates"}),
        }

    photos = body.get("photos", [])
    if not photos:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "At least one photo is required"}),
        }

    if len(photos) > 3:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Maximum 3 photos allowed"}),
        }

    # Verify the target location exists and has no photos
    try:
        response = locations_table.get_item(
            Key={"PK": f"location#{target_location_id}", "SK": "metadata"}
        )
        location = response.get("Item")

        if not location:
            return {
                "statusCode": 404,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "Target location not found"}),
            }

        # Check if location already has photos
        existing_photos = location.get("photos", [])
        if existing_photos and len(existing_photos) > 0:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "This location already has photos"}),
            }

    except ClientError as e:
        print(f"Error fetching location: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Failed to verify location"}),
        }

    # Check if user already has a pending photo submission for this location
    try:
        scan_response = table.scan(
            FilterExpression="SK = :sk AND #type = :type AND targetLocationId = :locId AND submittedBy = :userId AND #status = :status",
            ExpressionAttributeNames={"#type": "type", "#status": "status"},
            ExpressionAttributeValues={
                ":sk": "METADATA",
                ":type": "photo_update",
                ":locId": target_location_id,
                ":userId": user_id,
                ":status": "pending",
            },
        )
        if scan_response.get("Items"):
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "You already have a pending photo submission for this location"}),
            }
    except ClientError:
        pass  # Continue if check fails

    # Create photo update suggestion
    suggestion_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    item = {
        "PK": f"SUGGESTION#{suggestion_id}",
        "SK": "METADATA",
        "id": suggestion_id,
        "type": "photo_update",
        "targetLocationId": target_location_id,
        "targetAddress": location.get("address", "Unknown"),
        "photos": photos,
        "status": "pending",
        "submittedBy": user_id,
        "submittedByEmail": user_email,
        "createdAt": now,
    }

    table.put_item(Item=item)

    # Trigger AI analysis for each photo (async)
    if ANALYZE_PHOTO_FUNCTION and PHOTOS_BUCKET:
        for photo_key in photos[:3]:
            try:
                s3_event = {
                    "Records": [{
                        "s3": {
                            "bucket": {"name": PHOTOS_BUCKET},
                            "object": {"key": photo_key}
                        }
                    }]
                }
                lambda_client.invoke(
                    FunctionName=ANALYZE_PHOTO_FUNCTION,
                    InvocationType="Event",
                    Payload=json.dumps(s3_event),
                )
            except Exception as e:
                print(f"Failed to trigger analysis for {photo_key}: {e}")

    return {
        "statusCode": 201,
        "headers": CORS_HEADERS,
        "body": json.dumps({
            "success": True,
            "data": {"id": suggestion_id},
            "message": "Photo submission received and pending approval",
        }),
    }


def handler(event, context):
    """Handle POST /suggestions request.

    Supports two types of suggestions:
    - new_location: Submit a new location (default)
    - photo_update: Submit photos for an existing location without photos
    """

    # Handle preflight
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        # Get user info from Cognito authorizer
        claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
        user_id = claims.get("sub")
        user_email = claims.get("email")

        if not user_id:
            return {
                "statusCode": 401,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "Unauthorized"}),
            }

        # Parse request body
        body = json.loads(event.get("body", "{}"))
        suggestion_type = body.get("type", "new_location")  # new_location or photo_update
        target_location_id = body.get("targetLocationId")  # Required for photo_update

        # Handle photo_update type
        if suggestion_type == "photo_update":
            return handle_photo_update(body, user_id, user_email, target_location_id)

        # Handle new_location type (default)
        address = body.get("address", "").strip()
        description = body.get("description", "").strip()
        lat = body.get("lat")
        lng = body.get("lng")
        photos = body.get("photos", [])

        # Basic validation
        if not address:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "Address is required"}),
            }

        if not description or len(description) < 20:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "Description must be at least 20 characters"}),
            }

        if lat is None or lng is None:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "Coordinates (lat/lng) are required"}),
            }

        # Validate address format (must have street number and name)
        is_valid_address, address_error = validate_address_format(address)
        if not is_valid_address:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": address_error}),
            }

        # Server-side duplicate check (prevents race conditions and bypasses)
        is_duplicate, duplicate_message = check_for_duplicate(lat, lng, address)
        if is_duplicate:
            return {
                "statusCode": 409,  # Conflict
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": duplicate_message}),
            }

        # Create suggestion record
        suggestion_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        item = {
            "PK": f"SUGGESTION#{suggestion_id}",
            "SK": "METADATA",
            "id": suggestion_id,
            "type": "new_location",
            "address": address,
            "description": description,
            "lat": str(lat),
            "lng": str(lng),
            "photos": photos,
            "status": "pending",
            "submittedBy": user_id,
            "submittedByEmail": user_email,
            "createdAt": now,
        }

        table.put_item(Item=item)

        # Trigger AI analysis for each photo (async)
        if photos and ANALYZE_PHOTO_FUNCTION and PHOTOS_BUCKET:
            for photo_key in photos[:3]:  # Max 3 photos
                try:
                    # Simulate S3 event to reuse existing analyze_photo handler
                    s3_event = {
                        "Records": [{
                            "s3": {
                                "bucket": {"name": PHOTOS_BUCKET},
                                "object": {"key": photo_key}
                            }
                        }]
                    }
                    lambda_client.invoke(
                        FunctionName=ANALYZE_PHOTO_FUNCTION,
                        InvocationType="Event",  # Async
                        Payload=json.dumps(s3_event),
                    )
                except Exception as e:
                    print(f"Failed to trigger analysis for {photo_key}: {e}")

        return {
            "statusCode": 201,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "success": True,
                "data": {"id": suggestion_id},
                "message": "Suggestion submitted successfully",
            }),
        }

    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Invalid JSON body"}),
        }
    except ClientError as e:
        print(f"DynamoDB error: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Failed to save suggestion"}),
        }
    except Exception as e:
        print(f"Unexpected error: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Internal server error"}),
        }
