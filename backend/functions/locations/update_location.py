"""Lambda function to update a location (admin only)."""

import json
import os
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")

locations_table = dynamodb.Table(os.environ.get("LOCATIONS_TABLE_NAME", "christmas-lights-locations-dev"))
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "PUT,OPTIONS",
}

# Fields that can be updated by admin
ALLOWED_UPDATE_FIELDS = {
    "description",
    "aiDescription",
    "decorations",
    "displayQuality",
    "status",
}


def handler(event, context):
    """Handle PUT /locations/{id} request (admin only)."""

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

        # Parse request body
        body = json.loads(event.get("body", "{}"))
        if not body:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "Request body required"}),
            }

        # Get location to verify it exists
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

        # Filter updates to only allowed fields
        updates = {}
        for field in ALLOWED_UPDATE_FIELDS:
            if field in body:
                updates[field] = body[field]

        if not updates:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({
                    "success": False,
                    "message": "No valid fields to update. Allowed fields: " + ", ".join(ALLOWED_UPDATE_FIELDS)
                }),
            }

        # Add updatedAt timestamp
        updates["updatedAt"] = datetime.now(timezone.utc).isoformat()

        # Build update expression
        update_expr = "SET "
        expr_attr_values = {}
        expr_attr_names = {}

        for key, value in updates.items():
            clean_key = key.replace("_", "")
            update_expr += f"#{clean_key} = :{clean_key}, "
            expr_attr_names[f"#{clean_key}"] = key
            expr_attr_values[f":{clean_key}"] = value

        update_expr = update_expr.rstrip(", ")

        # Update the location
        response = locations_table.update_item(
            Key={"PK": f"location#{location_id}", "SK": "metadata"},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_attr_values,
            ExpressionAttributeNames=expr_attr_names,
            ReturnValues="ALL_NEW",
        )

        updated_location = response.get("Attributes", {})

        # Clean up response (remove DynamoDB keys)
        if "PK" in updated_location:
            del updated_location["PK"]
        if "SK" in updated_location:
            del updated_location["SK"]

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "success": True,
                "message": "Location updated successfully",
                "data": updated_location,
            }, default=str),
        }

    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Invalid JSON in request body"}),
        }
    except ClientError as e:
        print(f"DynamoDB error: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Failed to update location"}),
        }
    except Exception as e:
        print(f"Error: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Internal server error"}),
        }
