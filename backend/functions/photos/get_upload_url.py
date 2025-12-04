"""Lambda function to generate presigned POST URLs for photo uploads."""

import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

s3_client = boto3.client("s3")

PHOTOS_BUCKET = os.environ.get("PHOTOS_BUCKET_NAME", "christmas-lights-photos-dev")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

# Configuration
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_PHOTOS_PER_SUGGESTION = 3
URL_EXPIRATION_SECONDS = 900  # 15 minutes
ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"]

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}


def handler(event, context):
    """Handle POST /photos/upload-url request.

    Request body:
    {
        "contentType": "image/jpeg",  # Required: MIME type of the file
        "fileSize": 1234567,          # Required: Size in bytes
        "suggestionId": "uuid"        # Optional: Associate with a suggestion
    }

    Response:
    {
        "success": true,
        "data": {
            "uploadUrl": "https://bucket.s3.amazonaws.com/",
            "fields": { ... },        # Form fields for presigned POST
            "photoKey": "pending/...", # S3 object key
            "expiresIn": 900
        }
    }
    """

    # Handle preflight
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        # Get user info from Cognito authorizer
        claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
        user_id = claims.get("sub")

        if not user_id:
            return {
                "statusCode": 401,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "Unauthorized"}),
            }

        # Parse request body
        body = json.loads(event.get("body", "{}"))
        content_type = body.get("contentType", "").lower()
        file_size = body.get("fileSize")
        suggestion_id = body.get("suggestionId")

        # Validate content type
        if content_type not in ALLOWED_CONTENT_TYPES:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({
                    "success": False,
                    "message": f"Invalid content type. Allowed types: {', '.join(ALLOWED_CONTENT_TYPES)}",
                }),
            }

        # Validate file size
        if not isinstance(file_size, int) or file_size <= 0:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({
                    "success": False,
                    "message": "File size is required and must be a positive integer",
                }),
            }

        if file_size > MAX_FILE_SIZE:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({
                    "success": False,
                    "message": f"File size exceeds maximum allowed ({MAX_FILE_SIZE // (1024 * 1024)} MB)",
                }),
            }

        # Generate unique object key
        file_ext = _get_extension_from_content_type(content_type)
        photo_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d")

        # Key format: pending/{userId}/{timestamp}_{photoId}.{ext}
        # Using userId in path for easy cleanup and tracking
        if suggestion_id:
            photo_key = f"pending/{suggestion_id}/{photo_id}.{file_ext}"
        else:
            photo_key = f"pending/{user_id}/{timestamp}_{photo_id}.{file_ext}"

        # Generate presigned POST URL with conditions
        conditions = [
            {"bucket": PHOTOS_BUCKET},
            ["content-length-range", 1, MAX_FILE_SIZE],
            ["eq", "$Content-Type", content_type],  # Exact match for security
            {"key": photo_key},
        ]

        fields = {
            "Content-Type": content_type,
        }

        presigned_post = s3_client.generate_presigned_post(
            Bucket=PHOTOS_BUCKET,
            Key=photo_key,
            Fields=fields,
            Conditions=conditions,
            ExpiresIn=URL_EXPIRATION_SECONDS,
        )

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "success": True,
                "data": {
                    "uploadUrl": presigned_post["url"],
                    "fields": presigned_post["fields"],
                    "photoKey": photo_key,
                    "expiresIn": URL_EXPIRATION_SECONDS,
                },
            }),
        }

    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Invalid JSON body"}),
        }
    except ClientError as e:
        print(f"S3 error: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Failed to generate upload URL"}),
        }
    except Exception as e:
        print(f"Unexpected error: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Internal server error"}),
        }


def _get_extension_from_content_type(content_type: str) -> str:
    """Map content type to file extension."""
    mapping = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/heic": "heic",
    }
    return mapping.get(content_type, "jpg")
