"""Lambda function to get suggestions (admin only)."""

import json
import os
from decimal import Decimal

import boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ.get("SUGGESTIONS_TABLE_NAME", "christmas-lights-suggestions-dev"))

ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

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


def handler(event, context):
    """Handle GET /suggestions request."""
    
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        # Get status filter from query params
        params = event.get("queryStringParameters") or {}
        status_filter = params.get("status", "pending")

        # Scan for suggestions with status filter
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
            suggestions.append({
                "id": item.get("id"),
                "address": item.get("address"),
                "description": item.get("description"),
                "lat": float(item.get("lat", 0)),
                "lng": float(item.get("lng", 0)),
                "photos": item.get("photos", []),
                "status": item.get("status"),
                "submittedBy": item.get("submittedBy"),
                "submittedByEmail": item.get("submittedByEmail"),
                "createdAt": item.get("createdAt"),
            })

        # Sort by createdAt descending
        suggestions.sort(key=lambda x: x.get("createdAt", ""), reverse=True)

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "success": True,
                "data": suggestions,
            }, cls=DecimalEncoder),
        }

    except Exception as e:
        print(f"Error getting suggestions: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Failed to get suggestions"}),
        }
