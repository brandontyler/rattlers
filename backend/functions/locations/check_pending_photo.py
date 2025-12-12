"""Lambda function to check if user has pending photo submission for a location."""

import json
import os

import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
suggestions_table = dynamodb.Table(os.environ.get("SUGGESTIONS_TABLE_NAME", "christmas-lights-suggestions-dev"))

ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
}


def handler(event, context):
    """Handle GET /locations/{id}/pending-photo request."""

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

        # Get location ID from path
        location_id = event.get("pathParameters", {}).get("id")
        if not location_id:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "Location ID required"}),
            }

        # Check for pending photo submission
        try:
            response = suggestions_table.scan(
                FilterExpression="SK = :sk AND #type = :type AND targetLocationId = :locId AND submittedBy = :userId AND #status = :status",
                ExpressionAttributeNames={"#type": "type", "#status": "status"},
                ExpressionAttributeValues={
                    ":sk": "METADATA",
                    ":type": "photo_update",
                    ":locId": location_id,
                    ":userId": user_id,
                    ":status": "pending",
                },
            )

            has_pending = len(response.get("Items", [])) > 0

            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({
                    "success": True,
                    "data": {"hasPending": has_pending},
                }),
            }

        except ClientError as e:
            print(f"DynamoDB error: {e}")
            return {
                "statusCode": 500,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "Failed to check pending submissions"}),
            }

    except Exception as e:
        print(f"Error: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Internal server error"}),
        }
