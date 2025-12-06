"""Lambda function to delete a location and all related data (admin only)."""

import json
import os
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")

locations_table = dynamodb.Table(os.environ.get("LOCATIONS_TABLE_NAME", "christmas-lights-locations-dev"))
feedback_table = dynamodb.Table(os.environ.get("FEEDBACK_TABLE_NAME", "christmas-lights-feedback-dev"))
PHOTOS_BUCKET = os.environ.get("PHOTOS_BUCKET_NAME", "christmas-lights-photos-dev")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "DELETE,OPTIONS",
}


def handler(event, context):
    """Handle DELETE /locations/{id} request (admin only)."""
    
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        location_id = event.get("pathParameters", {}).get("id")
        if not location_id:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "Location ID required"}),
            }

        # Get location to find photos
        response = locations_table.get_item(
            Key={"PK": f"location#{location_id}", "SK": "metadata"}
        )
        location = response.get("Item")

        if not location:
            return {
                "statusCode": 404,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "Location not found"}),
            }

        # Delete photos from S3
        photos = location.get("photos", [])
        for photo_url in photos:
            try:
                # Extract key from URL or use directly if it's a key
                if "cloudfront.net/" in photo_url:
                    # CDN URL: https://xxx.cloudfront.net/{locationId}/filename.jpg
                    key = f"approved/{photo_url.split('cloudfront.net/')[-1]}"
                elif photo_url.startswith("approved/") or photo_url.startswith("pending/"):
                    key = photo_url
                else:
                    continue
                s3.delete_object(Bucket=PHOTOS_BUCKET, Key=key)
            except Exception as e:
                print(f"Error deleting photo {photo_url}: {e}")

        # Delete all feedback for this location
        feedback_response = feedback_table.scan(
            FilterExpression="locationId = :locId",
            ExpressionAttributeValues={":locId": location_id},
        )
        for item in feedback_response.get("Items", []):
            feedback_table.delete_item(
                Key={"PK": item["PK"], "SK": item["SK"]}
            )

        # Delete the location
        locations_table.delete_item(
            Key={"PK": f"location#{location_id}", "SK": "metadata"}
        )

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "success": True,
                "message": "Location and all related data deleted",
            }),
        }

    except ClientError as e:
        print(f"DynamoDB error: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Failed to delete location"}),
        }
    except Exception as e:
        print(f"Error: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Internal server error"}),
        }
