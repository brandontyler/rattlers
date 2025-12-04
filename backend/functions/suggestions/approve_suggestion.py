"""Lambda function to approve a suggestion and create a location."""

import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
suggestions_table = dynamodb.Table(os.environ.get("SUGGESTIONS_TABLE_NAME", "christmas-lights-suggestions-dev"))
locations_table = dynamodb.Table(os.environ.get("LOCATIONS_TABLE_NAME", "christmas-lights-locations-dev"))

ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}


def handler(event, context):
    """Handle POST /suggestions/{id}/approve request."""
    
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        # Get suggestion ID from path
        suggestion_id = event.get("pathParameters", {}).get("id")
        if not suggestion_id:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "Suggestion ID required"}),
            }

        # Get admin user info
        claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
        admin_id = claims.get("sub")

        # Get the suggestion
        response = suggestions_table.get_item(
            Key={"PK": f"SUGGESTION#{suggestion_id}", "SK": "METADATA"}
        )
        suggestion = response.get("Item")

        if not suggestion:
            return {
                "statusCode": 404,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "Suggestion not found"}),
            }

        if suggestion.get("status") != "pending":
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "Suggestion already processed"}),
            }

        now = datetime.now(timezone.utc).isoformat()
        location_id = str(uuid.uuid4())

        # Create new location (use lowercase pk/sk to match existing convention)
        location_item = {
            "PK": f"location#{location_id}",
            "SK": "metadata",
            "id": location_id,
            "address": suggestion.get("address"),
            "description": suggestion.get("description"),
            "lat": Decimal(str(suggestion.get("lat"))),
            "lng": Decimal(str(suggestion.get("lng"))),
            "photos": suggestion.get("photos", []),
            "status": "active",
            "feedbackCount": 0,
            "averageRating": 0,
            "likeCount": 0,
            "reportCount": 0,
            "createdAt": now,
            "createdBy": suggestion.get("submittedBy"),
        }
        locations_table.put_item(Item=location_item)

        # Update suggestion status
        suggestions_table.update_item(
            Key={"PK": f"SUGGESTION#{suggestion_id}", "SK": "METADATA"},
            UpdateExpression="SET #status = :status, reviewedAt = :reviewedAt, reviewedBy = :reviewedBy, locationId = :locationId",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":status": "approved",
                ":reviewedAt": now,
                ":reviewedBy": admin_id,
                ":locationId": location_id,
            },
        )

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "success": True,
                "message": "Suggestion approved",
                "data": {"locationId": location_id},
            }),
        }

    except ClientError as e:
        print(f"DynamoDB error: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Failed to approve suggestion"}),
        }
    except Exception as e:
        print(f"Error approving suggestion: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Internal server error"}),
        }
