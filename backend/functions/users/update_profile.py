"""
Lambda function to update user profile.
PUT /users/profile
"""

import os
import json
from typing import Dict, Any
from datetime import datetime
import boto3
from auth import require_auth, get_user_info
from responses import success_response, bad_request, internal_error

dynamodb = boto3.resource("dynamodb")
users_table_name = os.environ.get("USERS_TABLE_NAME")
users_table = dynamodb.Table(users_table_name)


@require_auth
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle PUT /users/profile request."""
    try:
        user = get_user_info(event)
        user_id = user["id"]

        # Parse request body
        try:
            body = json.loads(event.get("body", "{}"))
        except json.JSONDecodeError:
            return bad_request("Invalid JSON in request body")

        # Get current user profile
        response = users_table.get_item(Key={"userId": user_id})
        current_profile = response.get("Item", {})

        # Only allow updating username for now
        new_username = body.get("username")
        if not new_username:
            return bad_request("Username is required")

        # Validate username
        if not is_valid_username(new_username):
            return bad_request("Invalid username. Use only letters, numbers, and underscores (3-30 characters)")

        # Check if username is already taken (by someone else)
        if new_username != current_profile.get("username"):
            existing = users_table.query(
                IndexName="username-index",
                KeyConditionExpression="username = :username",
                ExpressionAttributeValues={":username": new_username},
                Limit=1
            )

            if existing.get("Items"):
                return bad_request("Username already taken")

        # Update profile
        users_table.update_item(
            Key={"userId": user_id},
            UpdateExpression="SET username = :username, updatedAt = :updated",
            ExpressionAttributeValues={
                ":username": new_username,
                ":updated": datetime.utcnow().isoformat(),
            }
        )

        # Return updated profile
        updated_profile = {
            "userId": user_id,
            "email": user["email"],
            "username": new_username,
            "updatedAt": datetime.utcnow().isoformat(),
        }

        return success_response(data=updated_profile, message="Profile updated successfully")

    except Exception as e:
        print(f"Error updating user profile: {str(e)}")
        import traceback
        traceback.print_exc()
        return internal_error()


def is_valid_username(username: str) -> bool:
    """Validate username format.

    Args:
        username: The username to validate

    Returns:
        True if valid, False otherwise
    """
    if not username:
        return False

    # Length check
    if len(username) < 3 or len(username) > 30:
        return False

    # Character check - only alphanumeric and underscores
    if not all(c.isalnum() or c == "_" for c in username):
        return False

    return True
