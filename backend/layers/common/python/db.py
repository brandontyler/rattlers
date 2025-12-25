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

    def increment_view_count(self, location_id: str) -> None:
        """Increment view count for a location (when someone views the location)."""
        self.table.update_item(
            Key={
                "PK": f"location#{location_id}",
                "SK": "metadata",
            },
            UpdateExpression="SET viewCount = if_not_exists(viewCount, :zero) + :inc",
            ExpressionAttributeValues={
                ":zero": 0,
                ":inc": 1,
            },
        )

    def increment_save_count(self, location_id: str) -> None:
        """Increment save count for a location (when someone saves/favorites the location)."""
        self.table.update_item(
            Key={
                "PK": f"location#{location_id}",
                "SK": "metadata",
            },
            UpdateExpression="SET saveCount = if_not_exists(saveCount, :zero) + :inc",
            ExpressionAttributeValues={
                ":zero": 0,
                ":inc": 1,
            },
        )

    def decrement_save_count(self, location_id: str) -> None:
        """Decrement save count for a location (minimum 0)."""
        try:
            self.table.update_item(
                Key={
                    "PK": f"location#{location_id}",
                    "SK": "metadata",
                },
                UpdateExpression="SET saveCount = saveCount - :dec",
                ConditionExpression="saveCount > :zero",
                ExpressionAttributeValues={
                    ":zero": 0,
                    ":dec": 1,
                },
            )
        except self.table.meta.client.exceptions.ConditionalCheckFailedException:
            # Count already at 0, no need to decrement
            print(f"Save count already at 0 for location {location_id}")


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

    def get_user_favorites(self, user_id: str) -> List[Dict]:
        """Get all favorites for a user."""
        response = self.table.query(
            IndexName="userId-locationId-index",
            KeyConditionExpression=Key("userId").eq(user_id),
            FilterExpression=Attr("type").eq("favorite"),
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


class RoutesTable:
    """Helper class for Routes table operations."""

    def __init__(self):
        self.table_name = os.environ.get("ROUTES_TABLE_NAME")
        self.table = get_table(self.table_name)

    def create(self, route: Dict) -> Dict:
        """Create a new route."""
        item = float_to_decimal(route)
        item["PK"] = f"route#{route['id']}"
        item["SK"] = "metadata"

        self.table.put_item(Item=item)
        return route

    def get(self, route_id: str) -> Optional[Dict]:
        """Get a route by ID."""
        response = self.table.get_item(
            Key={
                "PK": f"route#{route_id}",
                "SK": "metadata",
            }
        )
        item = response.get("Item")
        return decimal_to_float(item) if item else None

    def update(self, route_id: str, updates: Dict) -> Dict:
        """Update a route."""
        update_expr = "SET "
        expr_attr_values = {}
        expr_attr_names = {}

        for key, value in updates.items():
            clean_key = key.replace("_", "").replace("-", "")
            update_expr += f"#{clean_key} = :{clean_key}, "
            expr_attr_names[f"#{clean_key}"] = key
            expr_attr_values[f":{clean_key}"] = float_to_decimal(value)

        update_expr = update_expr.rstrip(", ")

        response = self.table.update_item(
            Key={
                "PK": f"route#{route_id}",
                "SK": "metadata",
            },
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_attr_values,
            ExpressionAttributeNames=expr_attr_names,
            ReturnValues="ALL_NEW",
        )

        return decimal_to_float(response.get("Attributes", {}))

    def delete(self, route_id: str) -> None:
        """Hard delete a route."""
        self.table.delete_item(
            Key={
                "PK": f"route#{route_id}",
                "SK": "metadata",
            }
        )

    def list_public(
        self,
        sort_by: str = "popular",
        limit: int = 50,
    ) -> List[Dict]:
        """
        List public routes.

        Args:
            sort_by: "popular" (by likes) or "new" (by creation date)
            limit: Maximum number of items to return

        Returns:
            List of route dictionaries
        """
        if sort_by == "popular":
            # Query by status with like count sorting
            response = self.table.query(
                IndexName="status-likeCount-index",
                KeyConditionExpression=Key("status").eq("active"),
                Limit=limit,
                ScanIndexForward=False,  # Descending order (most likes first)
            )
        else:
            # Query by status with creation date sorting
            response = self.table.query(
                IndexName="status-createdAt-index",
                KeyConditionExpression=Key("status").eq("active"),
                Limit=limit,
                ScanIndexForward=False,  # Descending order (newest first)
            )

        items = response.get("Items", [])
        return [decimal_to_float(item) for item in items]

    def list_by_user(self, user_id: str, limit: int = 50) -> List[Dict]:
        """List routes created by a specific user."""
        response = self.table.query(
            IndexName="createdBy-createdAt-index",
            KeyConditionExpression=Key("createdBy").eq(user_id),
            Limit=limit,
            ScanIndexForward=False,  # Newest first
        )

        items = response.get("Items", [])
        return [decimal_to_float(item) for item in items]

    def increment_like_count(self, route_id: str) -> None:
        """Increment like count for a route."""
        self.table.update_item(
            Key={
                "PK": f"route#{route_id}",
                "SK": "metadata",
            },
            UpdateExpression="SET likeCount = if_not_exists(likeCount, :zero) + :inc",
            ExpressionAttributeValues={
                ":zero": 0,
                ":inc": 1,
            },
        )

    def decrement_like_count(self, route_id: str) -> None:
        """Decrement like count for a route (minimum 0)."""
        try:
            self.table.update_item(
                Key={
                    "PK": f"route#{route_id}",
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
            print(f"Like count already at 0 for route {route_id}")

    def increment_save_count(self, route_id: str) -> None:
        """Increment save count for a route."""
        self.table.update_item(
            Key={
                "PK": f"route#{route_id}",
                "SK": "metadata",
            },
            UpdateExpression="SET saveCount = if_not_exists(saveCount, :zero) + :inc",
            ExpressionAttributeValues={
                ":zero": 0,
                ":inc": 1,
            },
        )

    def decrement_save_count(self, route_id: str) -> None:
        """Decrement save count for a route (minimum 0)."""
        try:
            self.table.update_item(
                Key={
                    "PK": f"route#{route_id}",
                    "SK": "metadata",
                },
                UpdateExpression="SET saveCount = saveCount - :dec",
                ConditionExpression="saveCount > :zero",
                ExpressionAttributeValues={
                    ":zero": 0,
                    ":dec": 1,
                },
            )
        except self.table.meta.client.exceptions.ConditionalCheckFailedException:
            print(f"Save count already at 0 for route {route_id}")

    def increment_start_count(self, route_id: str) -> None:
        """Increment start count for a route (when someone loads/starts the route)."""
        self.table.update_item(
            Key={
                "PK": f"route#{route_id}",
                "SK": "metadata",
            },
            UpdateExpression="SET startCount = if_not_exists(startCount, :zero) + :inc",
            ExpressionAttributeValues={
                ":zero": 0,
                ":inc": 1,
            },
        )


class RouteFeedbackTable:
    """Helper class for Route Feedback table operations."""

    def __init__(self):
        self.table_name = os.environ.get("ROUTE_FEEDBACK_TABLE_NAME")
        self.table = get_table(self.table_name)

    def create(self, feedback: Dict) -> Dict:
        """Create a new route feedback record."""
        item = float_to_decimal(feedback)
        item["PK"] = f"routeFeedback#{feedback['id']}"
        item["SK"] = f"route#{feedback['routeId']}"

        self.table.put_item(Item=item)
        return feedback

    def create_atomic(self, feedback: Dict) -> Tuple[bool, Optional[str]]:
        """
        Create feedback with conditional write to prevent duplicates.

        Returns:
            Tuple[bool, Optional[str]]: (success, error_code)
        """
        item = float_to_decimal(feedback)
        item["PK"] = f"routeFeedback#{feedback['id']}"
        item["SK"] = f"route#{feedback['routeId']}"

        try:
            self.table.put_item(
                Item=item,
                ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)",
            )
            return True, None
        except self.table.meta.client.exceptions.ConditionalCheckFailedException:
            print(f"Conditional write failed: route feedback already exists for PK={item['PK']}")
            return False, "ConditionalCheckFailedException"
        except Exception as e:
            print(f"Unexpected error creating route feedback: {str(e)}")
            return False, str(type(e).__name__)

    def delete(self, feedback_id: str, route_id: str) -> None:
        """Delete a route feedback record."""
        self.table.delete_item(
            Key={
                "PK": f"routeFeedback#{feedback_id}",
                "SK": f"route#{route_id}",
            }
        )

    def get_user_feedback(self, route_id: str, user_id: str, feedback_type: str) -> Optional[Dict]:
        """Get a user's feedback for a specific route and type."""
        try:
            response = self.table.query(
                IndexName="userId-routeId-index",
                KeyConditionExpression=Key("userId").eq(user_id) & Key("routeId").eq(route_id),
                FilterExpression=Attr("type").eq(feedback_type),
                Limit=1,
            )
            items = response.get("Items", [])
            return decimal_to_float(items[0]) if items else None
        except Exception as e:
            print(f"Error querying user route feedback: {str(e)}")
            return None

    def get_user_feedback_all_types(self, route_id: str, user_id: str) -> Dict[str, bool]:
        """Get all feedback types for a user on a specific route."""
        try:
            response = self.table.query(
                IndexName="userId-routeId-index",
                KeyConditionExpression=Key("userId").eq(user_id) & Key("routeId").eq(route_id),
            )
            items = response.get("Items", [])

            result = {"liked": False, "saved": False}
            for item in items:
                if item.get("type") == "like":
                    result["liked"] = True
                elif item.get("type") == "save":
                    result["saved"] = True

            return result
        except Exception as e:
            print(f"Error querying user route feedback: {str(e)}")
            return {"liked": False, "saved": False}

    def get_user_saved_routes(self, user_id: str) -> List[str]:
        """Get all route IDs that a user has saved."""
        try:
            response = self.table.query(
                IndexName="userId-routeId-index",
                KeyConditionExpression=Key("userId").eq(user_id),
                FilterExpression=Attr("type").eq("save"),
            )
            items = response.get("Items", [])
            return [item["routeId"] for item in items]
        except Exception as e:
            print(f"Error querying user saved routes: {str(e)}")
            return []

    def delete_all_for_route(self, route_id: str) -> None:
        """Delete all feedback records for a route."""
        response = self.table.scan(
            FilterExpression=Attr("routeId").eq(route_id),
        )

        items = response.get("Items", [])
        for item in items:
            self.table.delete_item(
                Key={
                    "PK": item["PK"],
                    "SK": item["SK"],
                }
            )
