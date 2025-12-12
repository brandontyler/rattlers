"""
Lambda function triggered after Cognito authentication.
Creates user profile with generated username on first login.
"""

import os
import boto3
from datetime import datetime
from username_generator import generate_christmas_username, generate_fallback_username

dynamodb = boto3.resource("dynamodb")
users_table_name = os.environ.get("USERS_TABLE_NAME")
users_table = dynamodb.Table(users_table_name)


def handler(event, context):
    """Handle post-authentication trigger from Cognito.

    This is called after a user successfully authenticates (signup or login).
    We use it to create a user profile with a generated username on first login.
    """

    try:
        # Get user info from Cognito event
        user_id = event["request"]["userAttributes"]["sub"]
        email = event["request"]["userAttributes"]["email"]
        # Get name if provided (optional field during signup)
        name = event["request"]["userAttributes"].get("name", "")

        print(f"Post-authentication for user {user_id} ({email}, name: {name})")

        # Check if user profile already exists
        try:
            response = users_table.get_item(Key={"userId": user_id})
            if "Item" in response:
                print(f"User profile already exists for {user_id}")
                return event  # User already has a profile
        except Exception as e:
            print(f"Error checking for existing profile: {e}")

        # Generate a fun Christmas username - prefer name over email for more fun!
        inspiration = name if name else email
        print(f"Generating username for new user using: {inspiration}")
        username = generate_christmas_username(inspiration)

        # Fallback if Bedrock fails
        if not username:
            print("Bedrock username generation failed, using fallback")
            username = generate_fallback_username(inspiration)

        print(f"Generated username: {username}")

        # Check if username already exists and make it unique if needed
        username = ensure_unique_username(username)

        # Create user profile
        user_profile = {
            "userId": user_id,
            "email": email,
            "username": username,
            "createdAt": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat(),
        }

        users_table.put_item(Item=user_profile)
        print(f"Created profile for user {user_id} with username {username}")

    except Exception as e:
        print(f"Error in post-authentication: {e}")
        import traceback
        traceback.print_exc()
        # Don't block authentication if profile creation fails

    # Always return the event to allow authentication to proceed
    return event


def ensure_unique_username(username: str) -> str:
    """Ensure username is unique by appending numbers if needed.

    Args:
        username: The proposed username

    Returns:
        A unique username
    """
    original_username = username
    counter = 1

    while True:
        try:
            # Check if username exists
            response = users_table.query(
                IndexName="username-index",
                KeyConditionExpression="username = :username",
                ExpressionAttributeValues={":username": username},
                Limit=1
            )

            if not response.get("Items"):
                # Username is available
                return username

            # Username exists, try adding a number
            counter += 1
            username = f"{original_username}{counter}"

            # Safety limit to prevent infinite loops
            if counter > 9999:
                # Just add a timestamp if we somehow hit this
                import time
                return f"{original_username}{int(time.time())}"

        except Exception as e:
            print(f"Error checking username uniqueness: {e}")
            # If check fails, just return the username and hope for the best
            return username
