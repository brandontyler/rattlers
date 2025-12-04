"""Lambda function to submit a new location suggestion."""

import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ.get("SUGGESTIONS_TABLE_NAME", "christmas-lights-suggestions-dev"))

ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}


def handler(event, context):
    """Handle POST /suggestions request."""
    
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
        address = body.get("address", "").strip()
        description = body.get("description", "").strip()
        lat = body.get("lat")
        lng = body.get("lng")
        # photos field reserved for future use
        photos = body.get("photos", [])

        # Validation
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

        # Create suggestion record
        suggestion_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        item = {
            "PK": f"SUGGESTION#{suggestion_id}",
            "SK": "METADATA",
            "id": suggestion_id,
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
