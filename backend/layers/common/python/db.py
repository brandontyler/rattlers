"""DynamoDB utilities."""

import os
import boto3
from typing import Dict, List, Optional, Any, Tuple
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
    ) -> List[Dict]:
        """
        List all locations using GSI query (optimized).

        Args:
            status: Status to filter by (default: active)
            limit: Maximum number of items to return (default: 500)

        Returns:
            List of location dictionaries
        """
        if not status:
            status = "active"

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

    def decrement_like_count(self, location_id: str) -> None:
        """Decrement like count for a location (minimum 0)."""
        try:
            self.table.update_item(
                Key={
                    "PK": f"location#{location_id}",
                    "SK": "metadata",
                },
                UpdateExpression="SET likeCount = likeCount - :dec",
                ConditionExpression="likeCount > :zero",
                ExpressionAttributeValues={
                    ":zero": 0,
                    ":dec": 1,
                },
            )
        except self.table.meta.client.exceptions.ConditionalCheckFailedException:
            # Count already at 0, no need to decrement
            print(f"Like count already at 0 for location {location_id}")

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

    def create_feedback_atomic(self, feedback: Dict) -> Tuple[bool, Optional[str]]:
        """
        Create feedback with conditional write to prevent duplicates.

        Returns:
            Tuple[bool, Optional[str]]: (success, error_code)
            - success=True, error_code=None: Item created successfully
            - success=False, error_code='ConditionalCheckFailedException': Item already exists
        """
        item = float_to_decimal(feedback)
        item["PK"] = f"feedback#{feedback['id']}"
        item["SK"] = f"location#{feedback['locationId']}"

        try:
            self.table.put_item(
                Item=item,
                ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)",
            )
            return True, None
        except self.table.meta.client.exceptions.ConditionalCheckFailedException:
            print(f"Conditional write failed: feedback already exists for PK={item['PK']}")
            return False, "ConditionalCheckFailedException"
        except Exception as e:
            print(f"Unexpected error creating feedback: {str(e)}")
            return False, str(type(e).__name__)

    def delete(self, feedback_id: str, location_id: str) -> None:
        """Delete a feedback record."""
        self.table.delete_item(
            Key={
                "PK": f"feedback#{feedback_id}",
                "SK": f"location#{location_id}",
            }
        )

    def get_user_feedback(self, location_id: str, user_id: str, feedback_type: str) -> Optional[Dict]:
        """
        Get a user's feedback for a specific location and type.
        Uses GSI for efficient querying instead of expensive SCAN.
        """
        try:
            response = self.table.query(
                IndexName="userId-locationId-index",
                KeyConditionExpression=Key("userId").eq(user_id) & Key("locationId").eq(location_id),
                FilterExpression=Attr("type").eq(feedback_type),
                Limit=1,
            )
            items = response.get("Items", [])
            return decimal_to_float(items[0]) if items else None
        except Exception as e:
            print(f"Error querying user feedback with GSI: {str(e)}")
            # Fallback to scan if GSI query fails (backwards compatibility)
            return self._get_user_feedback_scan(location_id, user_id, feedback_type)

    def _get_user_feedback_scan(self, location_id: str, user_id: str, feedback_type: str) -> Optional[Dict]:
        """Fallback scan method for backwards compatibility."""
        response = self.table.scan(
            FilterExpression=Attr("locationId").eq(location_id) &
                           Attr("userId").eq(user_id) &
                           Attr("type").eq(feedback_type),
            Limit=1,
        )
        items = response.get("Items", [])
        return decimal_to_float(items[0]) if items else None

    def get_by_location(self, location_id: str, limit: int = 100) -> List[Dict]:
        """Get all feedback for a location."""
        response = self.table.scan(
            FilterExpression=Attr("locationId").eq(location_id),
            Limit=limit,
        )

        items = response.get("Items", [])
        return [decimal_to_float(item) for item in items]


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
