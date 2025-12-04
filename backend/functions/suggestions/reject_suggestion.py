"""Lambda function to reject a suggestion."""

import json
import os
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
s3_client = boto3.client("s3")

table = dynamodb.Table(os.environ.get("SUGGESTIONS_TABLE_NAME", "christmas-lights-suggestions-dev"))
PHOTOS_BUCKET = os.environ.get("PHOTOS_BUCKET_NAME", "christmas-lights-photos-dev")

ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}


def handler(event, context):
    """Handle POST /suggestions/{id}/reject request."""
    
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

        # Get rejection reason from body
        body = json.loads(event.get("body", "{}"))
        reason = body.get("reason", "")

        # Verify suggestion exists and is pending
        response = table.get_item(
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

        # Delete associated photos from S3 (pending/ directory)
        pending_photos = suggestion.get("photos", [])
        for photo_key in pending_photos:
            if photo_key and photo_key.startswith("pending/"):
                try:
                    s3_client.delete_object(Bucket=PHOTOS_BUCKET, Key=photo_key)
                    print(f"Deleted photo: {photo_key}")
                except ClientError as e:
                    print(f"Error deleting photo {photo_key}: {e}")
                    # Continue with other photos even if one fails

        # Update suggestion status
        table.update_item(
            Key={"PK": f"SUGGESTION#{suggestion_id}", "SK": "METADATA"},
            UpdateExpression="SET #status = :status, reviewedAt = :reviewedAt, reviewedBy = :reviewedBy, rejectionReason = :reason",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":status": "rejected",
                ":reviewedAt": now,
                ":reviewedBy": admin_id,
                ":reason": reason,
            },
        )

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": True, "message": "Suggestion rejected"}),
        }

    except ClientError as e:
        print(f"DynamoDB error: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Failed to reject suggestion"}),
        }
    except Exception as e:
        print(f"Error rejecting suggestion: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Internal server error"}),
        }
