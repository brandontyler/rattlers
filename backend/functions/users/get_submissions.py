"""
Lambda function to get user's submissions.
GET /users/submissions
"""

import os
from typing import Dict, Any
import boto3
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError
from auth import require_auth, get_user_info
from responses import success_response, internal_error


dynamodb = boto3.resource("dynamodb")
s3_client = boto3.client("s3")


@require_auth
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle GET /users/submissions request."""
    try:
        user = get_user_info(event)
        user_id = user["id"]

        # Get suggestions table
        suggestions_table_name = os.environ.get("SUGGESTIONS_TABLE_NAME")
        suggestions_table = dynamodb.Table(suggestions_table_name)

        # Get photos bucket for presigned URLs
        photos_bucket = os.environ.get("PHOTOS_BUCKET_NAME")
        presigned_url_expiry = 86400  # 24 hours

        # Query all submissions for this user
        response = suggestions_table.scan(
            FilterExpression=Attr("submittedBy").eq(user_id)
        )

        submissions = []
        for item in response.get("Items", []):
            # Generate presigned URLs for photos
            photo_keys = item.get("photos", [])
            photo_urls = []

            if photo_keys and photos_bucket:
                for key in photo_keys:
                    if key:
                        try:
                            url = s3_client.generate_presigned_url(
                                "get_object",
                                Params={"Bucket": photos_bucket, "Key": key},
                                ExpiresIn=presigned_url_expiry,
                            )
                            photo_urls.append(url)
                        except ClientError as e:
                            print(f"Error generating presigned URL for {key}: {str(e)}")

            submission = {
                "id": item.get("id"),
                "address": item.get("address"),
                "description": item.get("description"),
                "photos": photo_urls,
                "status": item.get("status"),
                "submittedAt": item.get("createdAt"),
                "lat": float(item.get("lat", 0)),
                "lng": float(item.get("lng", 0)),
            }

            # Add optional fields if present
            if item.get("reviewedAt"):
                submission["reviewedAt"] = item.get("reviewedAt")

            if item.get("rejectionReason"):
                submission["rejectionReason"] = item.get("rejectionReason")

            submissions.append(submission)

        # Sort by submission date (most recent first)
        submissions.sort(key=lambda x: x.get("submittedAt", ""), reverse=True)

        return success_response(data=submissions)

    except Exception as e:
        print(f"Error getting user submissions: {str(e)}")
        import traceback
        traceback.print_exc()
        return internal_error()
