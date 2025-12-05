"""Lambda function to get suggestions (admin only)."""

import json
import os
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
s3_client = boto3.client("s3")

table = dynamodb.Table(os.environ.get("SUGGESTIONS_TABLE_NAME", "christmas-lights-suggestions-dev"))
PHOTOS_BUCKET = os.environ.get("PHOTOS_BUCKET_NAME", "christmas-lights-photos-dev")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")
PRESIGNED_URL_EXPIRY = 86400  # 24 hours

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
}


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def _get_presigned_url(key: str) -> str | None:
    """Generate presigned URL for S3 object."""
    try:
        return s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": PHOTOS_BUCKET, "Key": key},
            ExpiresIn=PRESIGNED_URL_EXPIRY,
        )
    except ClientError:
        return None


def handler(event, context):
    """Handle GET /suggestions request."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        params = event.get("queryStringParameters") or {}
        status_filter = params.get("status", "pending")

        response = table.scan(
            FilterExpression="SK = :sk AND #status = :status",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":sk": "METADATA",
                ":status": status_filter,
            },
        )

        suggestions = []
        for item in response.get("Items", []):
            # Generate presigned URLs for photos
            photo_keys = item.get("photos", [])
            photo_urls = []
            for key in photo_keys:
                if key:
                    url = _get_presigned_url(key)
                    if url:
                        photo_urls.append(url)

            suggestions.append({
                "id": item.get("id"),
                "address": item.get("address"),
                "description": item.get("description"),
                "lat": float(item.get("lat", 0)),
                "lng": float(item.get("lng", 0)),
                "photos": photo_urls,
                "status": item.get("status"),
                "submittedBy": item.get("submittedBy"),
                "submittedByEmail": item.get("submittedByEmail"),
                "createdAt": item.get("createdAt"),
                "detectedTags": item.get("detectedTags", []),
                "aiDescription": item.get("aiDescription"),
                "displayQuality": item.get("displayQuality"),
                "flaggedForReview": item.get("flaggedForReview", False),
            })

        suggestions.sort(key=lambda x: x.get("createdAt", ""), reverse=True)

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": True, "data": suggestions}, cls=DecimalEncoder),
        }

    except Exception as e:
        print(f"Error: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Failed to get suggestions"}),
        }
