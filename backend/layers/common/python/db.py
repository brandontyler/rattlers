"""DynamoDB utilities."""

import os
import boto3
from typing import Dict, List, Optional, Any
from decimal import Decimal
from boto3.dynamodb.conditions import Key, Attr


# Initialize DynamoDB resource
dynamodb = boto3.resource("dynamodb")


def get_table(table_name: str):
    """Get a DynamoDB table resource."""
    return dynamodb.Table(table_name)


def decimal_to_float(obj: Any) -> Any:
    """Convert Decimal objects to float for JSON serialization."""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_float(item) for item in obj]
    return obj


def float_to_decimal(obj: Any) -> Any:
    """Convert float objects to Decimal for DynamoDB."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: float_to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [float_to_decimal(item) for item in obj]
    return obj


class LocationsTable:
    """Helper class for Locations table operations."""

    def __init__(self):
        self.table_name = os.environ.get("LOCATIONS_TABLE_NAME")
        self.table = get_table(self.table_name)

    def create(self, location: Dict) -> Dict:
        """Create a new location."""
        item = float_to_decimal(location)
        item["PK"] = f"location#{location['id']}"
        item["SK"] = "metadata"

        self.table.put_item(Item=item)
        return location

    def get(self, location_id: str) -> Optional[Dict]:
        """Get a location by ID."""
        response = self.table.get_item(
            Key={
                "PK": f"location#{location_id}",
                "SK": "metadata",
            }
        )
        item = response.get("Item")
        return decimal_to_float(item) if item else None

    def update(self, location_id: str, updates: Dict) -> Dict:
        """Update a location."""
        # Build update expression
        update_expr = "SET "
        expr_attr_values = {}
        expr_attr_names = {}

        for key, value in updates.items():
            clean_key = key.replace("_", "")
            update_expr += f"#{clean_key} = :{clean_key}, "
            expr_attr_names[f"#{clean_key}"] = key
            expr_attr_values[f":{clean_key}"] = float_to_decimal(value)

        update_expr = update_expr.rstrip(", ")

        response = self.table.update_item(
            Key={
                "PK": f"location#{location_id}",
                "SK": "metadata",
            },
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_attr_values,
            ExpressionAttributeNames=expr_attr_names,
            ReturnValues="ALL_NEW",
        )

        return decimal_to_float(response.get("Attributes", {}))

    def delete(self, location_id: str) -> None:
        """Delete a location (soft delete by setting status)."""
        self.update(location_id, {"status": "inactive"})

    def list_all(
        self,
        status: Optional[str] = "active",
        limit: int = 500,  # Increase default to support map view
        sort_by_rating: bool = False,
    ) -> List[Dict]:
        """
        List all locations using GSI query (optimized).

        Args:
            status: Status to filter by (default: active)
            limit: Maximum number of items to return (default: 500)
            sort_by_rating: If True, sort by rating (descending), else by createdAt

        Returns:
            List of location dictionaries
        """
        if not status:
            status = "active"

        # Choose GSI based on sort preference
        if sort_by_rating:
            # Use rating index to get top-rated displays
            index_name = "status-averageRating-index"
            response = self.table.query(
                IndexName=index_name,
                KeyConditionExpression=Key("status").eq(status),
                Limit=limit,
                ScanIndexForward=False,  # Descending order (highest rating first)
            )
        else:
            # Use createdAt index for newest first
            index_name = "status-createdAt-index"
            response = self.table.query(
                IndexName=index_name,
                KeyConditionExpression=Key("status").eq(status),
                Limit=limit,
                ScanIndexForward=False,  # Descending order (newest first)
            )

        items = response.get("Items", [])
        return [decimal_to_float(item) for item in items]

    def increment_feedback_count(self, location_id: str) -> None:
        """Increment feedback count for a location."""
        self.table.update_item(
            Key={
                "PK": f"location#{location_id}",
                "SK": "metadata",
            },
            UpdateExpression="SET feedbackCount = if_not_exists(feedbackCount, :zero) + :inc",
            ExpressionAttributeValues={
                ":zero": 0,
                ":inc": 1,
            },
        )

    def increment_like_count(self, location_id: str) -> None:
        """Increment like count for a location."""
        self.table.update_item(
            Key={
                "PK": f"location#{location_id}",
                "SK": "metadata",
            },
            UpdateExpression="SET likeCount = if_not_exists(likeCount, :zero) + :inc",
            ExpressionAttributeValues={
                ":zero": 0,
                ":inc": 1,
            },
        )

    def increment_report_count(self, location_id: str) -> int:
        """Increment report count and return new count."""
        response = self.table.update_item(
            Key={
                "PK": f"location#{location_id}",
                "SK": "metadata",
            },
            UpdateExpression="SET reportCount = if_not_exists(reportCount, :zero) + :inc",
            ExpressionAttributeValues={
                ":zero": 0,
                ":inc": 1,
            },
            ReturnValues="ALL_NEW",
        )
        return int(response["Attributes"].get("reportCount", 0))

    def update_rating(self, location_id: str, new_average: float) -> None:
        """Update average rating for a location."""
        self.table.update_item(
            Key={
                "PK": f"location#{location_id}",
                "SK": "metadata",
            },
            UpdateExpression="SET averageRating = :rating",
            ExpressionAttributeValues={
                ":rating": Decimal(str(new_average)),
            },
        )


class FeedbackTable:
    """Helper class for Feedback table operations."""

    def __init__(self):
        self.table_name = os.environ.get("FEEDBACK_TABLE_NAME")
        self.table = get_table(self.table_name)

    def create(self, feedback: Dict) -> Dict:
        """Create a new feedback record."""
        item = float_to_decimal(feedback)
        item["PK"] = f"feedback#{feedback['id']}"
        item["SK"] = f"location#{feedback['locationId']}"

        self.table.put_item(Item=item)
        return feedback

    def get_by_location(self, location_id: str, limit: int = 100) -> List[Dict]:
        """Get all feedback for a location."""
        # Use GSI to query by location_id
        # For MVP, we'll scan (implement GSI in CDK later)
        response = self.table.scan(
            FilterExpression=Attr("locationId").eq(location_id),
            Limit=limit,
        )

        items = response.get("Items", [])
        return [decimal_to_float(item) for item in items]

    def calculate_average_rating(self, location_id: str) -> float:
        """Calculate average rating for a location."""
        feedbacks = self.get_by_location(location_id)
        ratings = [f.get("rating") for f in feedbacks if f.get("rating") is not None]

        if not ratings:
            return 0.0

        return sum(ratings) / len(ratings)


class SuggestionsTable:
    """Helper class for Suggestions table operations."""

    def __init__(self):
        self.table_name = os.environ.get("SUGGESTIONS_TABLE_NAME")
        self.table = get_table(self.table_name)

    def create(self, suggestion: Dict) -> Dict:
        """Create a new suggestion."""
        item = float_to_decimal(suggestion)
        item["PK"] = f"suggestion#{suggestion['id']}"
        item["SK"] = f"status#{suggestion['status']}"

        self.table.put_item(Item=item)
        return suggestion

    def get(self, suggestion_id: str) -> Optional[Dict]:
        """Get a suggestion by ID."""
        # Query with PK prefix (we don't know SK status)
        response = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"suggestion#{suggestion_id}")
        )

        items = response.get("Items", [])
        return decimal_to_float(items[0]) if items else None

    def update_status(
        self,
        suggestion_id: str,
        status: str,
        reviewed_by: str,
        reviewed_at: str,
    ) -> None:
        """Update suggestion status."""
        # Get current item to delete old SK
        current = self.get(suggestion_id)
        if not current:
            return

        # Delete old item
        self.table.delete_item(
            Key={
                "PK": f"suggestion#{suggestion_id}",
                "SK": f"status#{current['status']}",
            }
        )

        # Create new item with updated status
        current["status"] = status
        current["reviewedBy"] = reviewed_by
        current["reviewedAt"] = reviewed_at

        item = float_to_decimal(current)
        item["PK"] = f"suggestion#{suggestion_id}"
        item["SK"] = f"status#{status}"

        self.table.put_item(Item=item)

    def list_by_status(self, status: str = "pending", limit: int = 50) -> List[Dict]:
        """List suggestions by status."""
        response = self.table.scan(
            FilterExpression=Attr("status").eq(status),
            Limit=limit,
        )

        items = response.get("Items", [])
        return [decimal_to_float(item) for item in items]
