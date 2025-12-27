"""Lambda function to approve a suggestion and create a location."""

import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
s3_client = boto3.client("s3")

suggestions_table = dynamodb.Table(os.environ.get("SUGGESTIONS_TABLE_NAME", "christmas-lights-suggestions-dev"))
locations_table = dynamodb.Table(os.environ.get("LOCATIONS_TABLE_NAME", "christmas-lights-locations-dev"))
users_table = dynamodb.Table(os.environ.get("USERS_TABLE_NAME", "christmas-lights-users-dev"))
PHOTOS_BUCKET = os.environ.get("PHOTOS_BUCKET_NAME", "christmas-lights-photos-dev")
PHOTOS_CDN_URL = os.environ.get("PHOTOS_CDN_URL", "")

ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}


def handle_photo_update_approval(suggestion, admin_id, now):
    """Handle approval of a photo update suggestion.

    Instead of creating a new location, this appends photos to an existing location.
    """
    suggestion_id = suggestion.get("id")
    target_location_id = suggestion.get("targetLocationId")

    if not target_location_id:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Photo update missing target location ID"}),
        }

    # Get the target location
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
    except ClientError as e:
        print(f"Error fetching location: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Failed to fetch location"}),
        }

    # Move photos from pending/ to approved/ for the target location
    pending_photos = suggestion.get("photos", [])
    approved_photo_urls = []

    for photo_key in pending_photos:
        if photo_key and photo_key.startswith("pending/"):
            try:
                filename = photo_key.split("/")[-1]
                approved_key = f"approved/{target_location_id}/{filename}"

                # Copy to approved location
                s3_client.copy_object(
                    Bucket=PHOTOS_BUCKET,
                    CopySource={"Bucket": PHOTOS_BUCKET, "Key": photo_key},
                    Key=approved_key,
                )

                # Delete from pending location
                s3_client.delete_object(Bucket=PHOTOS_BUCKET, Key=photo_key)

                # Add CDN URL to list
                cdn_path = f"{target_location_id}/{filename}"
                if PHOTOS_CDN_URL:
                    approved_photo_urls.append(f"{PHOTOS_CDN_URL}/{cdn_path}")
                else:
                    approved_photo_urls.append(f"https://{PHOTOS_BUCKET}.s3.amazonaws.com/{approved_key}")

            except ClientError as e:
                print(f"Error moving photo {photo_key}: {e}")

    # Update the existing location with the new photos and AI-generated fields
    update_expression = "SET photos = :photos, updatedAt = :updatedAt"
    expression_values = {
        ":photos": approved_photo_urls,
        ":updatedAt": now,
    }

    # Add AI-generated fields from the suggestion
    if suggestion.get("detectedTags"):
        update_expression += ", decorations = :decorations"
        expression_values[":decorations"] = suggestion["detectedTags"]
    if suggestion.get("aiDescription"):
        update_expression += ", aiDescription = :aiDescription"
        expression_values[":aiDescription"] = suggestion["aiDescription"]
    if suggestion.get("displayQuality"):
        update_expression += ", displayQuality = :displayQuality"
        expression_values[":displayQuality"] = suggestion["displayQuality"]

    # Track who submitted the photo
    if suggestion.get("submittedBy"):
        update_expression += ", photoSubmittedBy = :photoSubmittedBy"
        expression_values[":photoSubmittedBy"] = suggestion["submittedBy"]

    try:
        locations_table.update_item(
            Key={"PK": f"location#{target_location_id}", "SK": "metadata"},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values,
        )
    except ClientError as e:
        print(f"Error updating location: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Failed to update location with photos"}),
        }

    # Update suggestion status
    suggestions_table.update_item(
        Key={"PK": f"SUGGESTION#{suggestion_id}", "SK": "METADATA"},
        UpdateExpression="SET #status = :status, reviewedAt = :reviewedAt, reviewedBy = :reviewedBy",
        ExpressionAttributeNames={"#status": "status"},
        ExpressionAttributeValues={
            ":status": "approved",
            ":reviewedAt": now,
            ":reviewedBy": admin_id,
        },
    )

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps({
            "success": True,
            "message": "Photo update approved",
            "data": {"locationId": target_location_id},
        }),
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
        suggestion_type = suggestion.get("type", "new_location")

        # Handle photo_update type differently
        if suggestion_type == "photo_update":
            return handle_photo_update_approval(suggestion, admin_id, now)

        location_id = str(uuid.uuid4())

        # Move photos from pending/ to approved/ and generate CDN URLs
        pending_photos = suggestion.get("photos", [])
        approved_photo_urls = []

        for photo_key in pending_photos:
            if photo_key and photo_key.startswith("pending/"):
                try:
                    # Generate new key in approved/ directory
                    filename = photo_key.split("/")[-1]
                    approved_key = f"approved/{location_id}/{filename}"

                    # Copy to approved location
                    s3_client.copy_object(
                        Bucket=PHOTOS_BUCKET,
                        CopySource={"Bucket": PHOTOS_BUCKET, "Key": photo_key},
                        Key=approved_key,
                    )

                    # Delete from pending location
                    s3_client.delete_object(Bucket=PHOTOS_BUCKET, Key=photo_key)

                    # Add CDN URL to list (CloudFront has origin_path=/approved, so omit prefix)
                    cdn_path = f"{location_id}/{filename}"
                    if PHOTOS_CDN_URL:
                        approved_photo_urls.append(f"{PHOTOS_CDN_URL}/{cdn_path}")
                    else:
                        approved_photo_urls.append(f"https://{PHOTOS_BUCKET}.s3.amazonaws.com/{approved_key}")

                except ClientError as e:
                    print(f"Error moving photo {photo_key}: {e}")
                    # Continue with other photos even if one fails

        # Create new location (use lowercase pk/sk to match existing convention)
        location_item = {
            "PK": f"location#{location_id}",
            "SK": "metadata",
            "id": location_id,
            "address": suggestion.get("address"),
            "description": suggestion.get("description"),
            "lat": Decimal(str(suggestion.get("lat"))),
            "lng": Decimal(str(suggestion.get("lng"))),
            "photos": approved_photo_urls,
            "status": "active",
            "feedbackCount": 0,
            "averageRating": 0,
            "likeCount": 0,
            "reportCount": 0,
            "createdAt": now,
            "createdBy": suggestion.get("submittedBy"),
        }

        # Lookup username for the submitter
        submitter_id = suggestion.get("submittedBy")
        if submitter_id:
            try:
                user_response = users_table.get_item(Key={"userId": submitter_id})
                user_item = user_response.get("Item", {})
                if user_item.get("username"):
                    location_item["createdByUsername"] = user_item["username"]
            except Exception as e:
                print(f"Warning: Could not fetch username for {submitter_id}: {e}")

        # Copy AI-generated fields from suggestion if they exist
        if suggestion.get("detectedTags"):
            location_item["decorations"] = suggestion["detectedTags"]
        if suggestion.get("aiDescription"):
            location_item["aiDescription"] = suggestion["aiDescription"]
        if suggestion.get("displayQuality"):
            location_item["displayQuality"] = suggestion["displayQuality"]

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
