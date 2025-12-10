"""
Lambda function to get user profile with submission stats.
GET /users/profile
"""

import os
from typing import Dict, Any
from datetime import datetime
import boto3
from boto3.dynamodb.conditions import Attr
from auth import require_auth, get_user_info
from responses import success_response, internal_error


dynamodb = boto3.resource("dynamodb")
cognito_client = boto3.client("cognito-idp")
users_table_name = os.environ.get("USERS_TABLE_NAME")
users_table = dynamodb.Table(users_table_name) if users_table_name else None


@require_auth
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle GET /users/profile request."""
    try:
        user = get_user_info(event)
        user_id = user["id"]
        email = user["email"]
        is_admin = user.get("is_admin", False)

        # Get username from users table
        username = None
        if users_table:
            try:
                response = users_table.get_item(Key={"userId": user_id})
                user_profile = response.get("Item", {})
                username = user_profile.get("username")
            except Exception as e:
                print(f"Warning: Could not fetch username from users table: {str(e)}")

        # Get user creation date from Cognito
        user_pool_id = os.environ.get("USER_POOL_ID")
        join_date = None

        try:
            if user_pool_id:
                response = cognito_client.admin_get_user(
                    UserPoolId=user_pool_id,
                    Username=user_id
                )
                join_date = response.get("UserCreateDate")
                if join_date:
                    join_date = join_date.isoformat()
        except Exception as e:
            print(f"Warning: Could not fetch user creation date: {str(e)}")
            # Fallback to current time if can't get from Cognito
            join_date = datetime.now().isoformat()

        # Get submission statistics
        suggestions_table_name = os.environ.get("SUGGESTIONS_TABLE_NAME")
        suggestions_table = dynamodb.Table(suggestions_table_name)

        # Query all suggestions for this user
        response = suggestions_table.scan(
            FilterExpression=Attr("submittedBy").eq(user_id)
        )

        submissions = response.get("Items", [])

        # Calculate stats
        total = len(submissions)
        approved = sum(1 for s in submissions if s.get("status") == "approved")
        pending = sum(1 for s in submissions if s.get("status") == "pending")
        rejected = sum(1 for s in submissions if s.get("status") == "rejected")

        # Build profile response
        profile = {
            "id": user_id,
            "email": email,
            "username": username,
            "isAdmin": is_admin,
            "joinDate": join_date or datetime.now().isoformat(),
            "stats": {
                "totalSubmissions": total,
                "approvedSubmissions": approved,
                "pendingSubmissions": pending,
                "rejectedSubmissions": rejected,
            }
        }

        return success_response(data=profile)

    except Exception as e:
        print(f"Error getting user profile: {str(e)}")
        import traceback
        traceback.print_exc()
        return internal_error()
