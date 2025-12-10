"""Generate fun Christmas-themed usernames using AWS Bedrock."""

import json
import boto3
from typing import Optional

bedrock = boto3.client("bedrock-runtime")

# Tool definition for structured username output
USERNAME_TOOL = {
    "name": "generate_username",
    "description": "Generate a fun Christmas-themed username",
    "input_schema": {
        "type": "object",
        "properties": {
            "username": {
                "type": "string",
                "description": "A fun, unique Christmas-themed username. Should be creative, festive, and memorable. Examples: 'JollyReindeerRider', 'TwinkleLightsMaster', 'GingerbreadArchitect', 'SantasHelper42', 'FrostyTheSnowExplorer', 'CandyCaneCollector'",
            }
        },
        "required": ["username"],
    },
}


def generate_christmas_username(email: str) -> Optional[str]:
    """Generate a fun Christmas-themed username based on email.

    Args:
        email: User's email address (used as inspiration)

    Returns:
        A fun Christmas-themed username, or None if generation fails
    """
    try:
        # Extract name part from email for inspiration (before @)
        email_prefix = email.split("@")[0] if "@" in email else email

        response = bedrock.invoke_model(
            modelId="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 256,
                "tools": [USERNAME_TOOL],
                "tool_choice": {"type": "tool", "name": "generate_username"},
                "messages": [{
                    "role": "user",
                    "content": f"""Generate a fun, creative Christmas-themed username for a user with email: {email_prefix}

Create a festive, memorable username that:
- Has a Christmas/winter holiday theme
- Is unique and creative
- Is family-friendly and positive
- Can incorporate elements from their email if relevant (like their name or interests)
- Includes Christmas-related words like: Jolly, Merry, Twinkle, Frosty, Snowy, Candy, Gingerbread, Reindeer, Sleigh, Elf, Star, Holly, Tinsel, Mistletoe, etc.
- May include numbers if needed for uniqueness

Examples of good usernames:
- JollyMapleExplorer
- TwinklingStarCollector
- GingerbreadWanderer
- FrostyLightsSeeker
- MerryReindeerFriend
- CandyCaneNavigator
- SnowyNightAdventurer

Use the generate_username tool to return the username.""",
                }],
            }),
        )

        result = json.loads(response["body"].read())

        # Extract tool use result
        for block in result.get("content", []):
            if block.get("type") == "tool_use" and block.get("name") == "generate_username":
                username = block.get("input", {}).get("username")
                if username:
                    # Clean up the username (remove spaces, ensure safe characters)
                    username = username.replace(" ", "")
                    # Only allow alphanumeric and underscores
                    username = "".join(c for c in username if c.isalnum() or c == "_")
                    return username[:30]  # Limit length

        # Fallback if tool use didn't work
        return None

    except Exception as e:
        print(f"Error generating username for {email}: {e}")
        return None


def generate_fallback_username(email: str) -> str:
    """Generate a simple fallback username if Bedrock fails.

    Args:
        email: User's email address

    Returns:
        A simple Christmas-themed fallback username
    """
    import random

    email_prefix = email.split("@")[0] if "@" in email else email
    # Clean the prefix
    clean_prefix = "".join(c for c in email_prefix if c.isalnum())[:15]

    christmas_adjectives = [
        "Jolly", "Merry", "Festive", "Frosty", "Snowy", "Sparkling",
        "Twinkling", "Cheery", "Bright", "Cozy", "Magical"
    ]

    christmas_nouns = [
        "Elf", "Reindeer", "Snowflake", "Star", "Light", "Sleigh",
        "Gingerbread", "CandyCane", "Holly", "Tinsel", "Ornament"
    ]

    adj = random.choice(christmas_adjectives)
    noun = random.choice(christmas_nouns)
    num = random.randint(1, 999)

    if clean_prefix:
        return f"{adj}{clean_prefix}{num}"
    else:
        return f"{adj}{noun}{num}"
