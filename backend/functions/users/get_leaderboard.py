"""
Lambda function to get leaderboard of top contributors.
GET /leaderboard
"""

import os
from typing import Dict, Any, List
from collections import defaultdict
import boto3
from boto3.dynamodb.conditions import Attr
from responses import success_response, internal_error


dynamodb = boto3.resource("dynamodb")
cognito_client = boto3.client("cognito-idp")


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle GET /leaderboard request.

    Returns a list of contributors ranked by approved submissions.
    """
    try:
        suggestions_table_name = os.environ.get("SUGGESTIONS_TABLE_NAME")
        users_table_name = os.environ.get("USERS_TABLE_NAME")
        user_pool_id = os.environ.get("USER_POOL_ID")

        suggestions_table = dynamodb.Table(suggestions_table_name)
        users_table = dynamodb.Table(users_table_name) if users_table_name else None

        # Get all approved suggestions
        response = suggestions_table.scan(
            FilterExpression=Attr("status").eq("approved")
        )

        approved_submissions = response.get("Items", [])

        # Handle pagination for large datasets
        while "LastEvaluatedKey" in response:
            response = suggestions_table.scan(
                FilterExpression=Attr("status").eq("approved"),
                ExclusiveStartKey=response["LastEvaluatedKey"]
            )
            approved_submissions.extend(response.get("Items", []))

        # Group by user
        user_submissions: Dict[str, int] = defaultdict(int)
        for submission in approved_submissions:
            user_id = submission.get("submittedBy")
            if user_id:
                user_submissions[user_id] += 1

        # Get user details for each contributor
        leaderboard: List[Dict[str, Any]] = []

        for user_id, approved_count in user_submissions.items():
            user_data = {
                "userId": user_id,
                "approvedSubmissions": approved_count,
                "username": None,
                "joinDate": None,
                "badge": get_highest_badge(approved_count),
            }

            # Get username from users table
            if users_table:
                try:
                    user_response = users_table.get_item(Key={"userId": user_id})
                    user_item = user_response.get("Item", {})
                    user_data["username"] = user_item.get("username")
                except Exception as e:
                    print(f"Warning: Could not fetch username for {user_id}: {e}")

            # Get join date from Cognito
            if user_pool_id:
                try:
                    cognito_response = cognito_client.admin_get_user(
                        UserPoolId=user_pool_id,
                        Username=user_id
                    )
                    join_date = cognito_response.get("UserCreateDate")
                    if join_date:
                        user_data["joinDate"] = join_date.isoformat()
                except Exception as e:
                    print(f"Warning: Could not fetch join date for {user_id}: {e}")

            # Use a display name if no username
            if not user_data["username"]:
                user_data["username"] = f"Contributor-{user_id[:8]}"

            leaderboard.append(user_data)

        # Sort by approved submissions (descending)
        leaderboard.sort(key=lambda x: x["approvedSubmissions"], reverse=True)

        # Add rank
        for i, entry in enumerate(leaderboard, 1):
            entry["rank"] = i

        return success_response(data=leaderboard)

    except Exception as e:
        print(f"Error getting leaderboard: {str(e)}")
        import traceback
        traceback.print_exc()
        return internal_error()


def get_highest_badge(approved_count: int) -> Dict[str, Any]:
    """Get the highest badge earned based on approved submission count.

    Badge thresholds:
    - First Light: 1 approved
    - Scout: 5 approved
    - Enthusiast: 15 approved
    - Expert: 50 approved
    """
    badges = [
        {"type": "expert", "threshold": 50, "label": "Expert"},
        {"type": "enthusiast", "threshold": 15, "label": "Enthusiast"},
        {"type": "scout", "threshold": 5, "label": "Scout"},
        {"type": "first-light", "threshold": 1, "label": "First Light"},
    ]

    for badge in badges:
        if approved_count >= badge["threshold"]:
            return {
                "type": badge["type"],
                "label": badge["label"],
            }

    return None
