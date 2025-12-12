"""Generate epic, fun Christmas-themed usernames using AWS Bedrock."""

import json
import boto3
from typing import Optional

bedrock = boto3.client("bedrock-runtime")

# Tool definition for structured username output
USERNAME_TOOL = {
    "name": "generate_username",
    "description": "Generate an epic Christmas lights adventure username",
    "input_schema": {
        "type": "object",
        "properties": {
            "username": {
                "type": "string",
                "description": "An epic, fun Christmas lights adventure username. Must be creative, memorable, and make people smile!",
            }
        },
        "required": ["username"],
    },
}


def generate_christmas_username(email: str) -> Optional[str]:
    """Generate an epic Christmas lights adventure username.

    Args:
        email: User's email address (used as inspiration)

    Returns:
        An epic Christmas-themed username, or None if generation fails
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
                    "content": f"""You are the WORLD'S MOST CREATIVE Christmas username generator for a Christmas Lights Adventure app!

This person LOVES Christmas lights. They drive around neighborhoods looking at amazing light displays. They're passionate, festive, and ready for adventure!

Their email starts with: {email_prefix}

Create ONE epic username that:
- Is FUN and makes people SMILE or LAUGH
- Sounds like someone who is OBSESSED with Christmas lights
- Uses creative word combinations (not just adjective+noun)
- Has personality and tells a story
- NO NUMBERS - be creative with words instead!
- CamelCase format, 15-25 characters ideal

Think about WHO this person is:
- A Christmas lights FANATIC
- Someone who plans routes to see the best displays
- A person who brings hot cocoa on their light-viewing adventures
- Someone whose neighbors know them as "the Christmas person"

AMAZING username examples (be THIS creative):
- GlowPatrolCaptain
- TinselTornadoTom
- DeckTheHallsDaily
- SleighBellSheriff
- WattageWizard
- IlluminationNation
- SparkleSquadLeader
- NorthPoleNavigator
- YuletideYeti
- BlinkingBonanza
- FestiveFueledFred
- GarlandGuru
- OrnamentObsessed
- MistletoeMarauder
- TwinkleTownMayor
- HollyJollyHunter
- ReindeerRoadie
- ChristmasChaser
- LightsOutLegend
- JingleJetPilot

Now create a UNIQUE, FUN username inspired by "{email_prefix}" - make it MEMORABLE!"""
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

        return None

    except Exception as e:
        print(f"Error generating username for {email}: {e}")
        return None


def generate_fallback_username(email: str) -> str:
    """Generate a fun fallback username if Bedrock fails.

    Args:
        email: User's email address

    Returns:
        A fun Christmas-themed fallback username (no numbers!)
    """
    import random
    import hashlib

    email_prefix = email.split("@")[0] if "@" in email else email
    # Clean the prefix and capitalize first letter
    clean_prefix = "".join(c for c in email_prefix if c.isalnum())[:12]
    if clean_prefix:
        clean_prefix = clean_prefix[0].upper() + clean_prefix[1:].lower()

    # Fun title/role words
    titles = [
        "Captain", "Chief", "Commander", "Guru", "Legend", "Master",
        "Mayor", "Pilot", "Ranger", "Scout", "Sheriff", "Wizard"
    ]

    # Christmas action/theme words
    themes = [
        "Glow", "Sparkle", "Twinkle", "Jingle", "Tinsel", "Garland",
        "Ornament", "Sleigh", "Cocoa", "Festive", "Merry", "Jolly"
    ]

    # Adventure words
    adventures = [
        "Patrol", "Squad", "Quest", "Chase", "Hunt", "Trek",
        "Safari", "Voyage", "Journey", "Mission", "Adventure", "Expedition"
    ]

    # Use email hash to consistently pick words (same email = same fallback)
    hash_val = int(hashlib.md5(email.lower().encode()).hexdigest(), 16)

    # Different patterns for variety
    pattern = hash_val % 4

    if pattern == 0 and clean_prefix:
        # TinselTornado + Name style
        theme = themes[hash_val % len(themes)]
        return f"{theme}{adventures[hash_val % len(adventures)]}{clean_prefix}"
    elif pattern == 1 and clean_prefix:
        # Name + Title style
        title = titles[hash_val % len(titles)]
        theme = themes[(hash_val >> 4) % len(themes)]
        return f"{theme}{title}{clean_prefix}"
    elif pattern == 2:
        # Double theme style
        theme1 = themes[hash_val % len(themes)]
        theme2 = themes[(hash_val >> 4) % len(themes)]
        if theme1 == theme2:
            theme2 = adventures[hash_val % len(adventures)]
        return f"{theme1}{theme2}{'Hero' if clean_prefix else 'Legend'}"
    else:
        # Title + Adventure style
        title = titles[hash_val % len(titles)]
        adventure = adventures[(hash_val >> 4) % len(adventures)]
        return f"{themes[hash_val % len(themes)]}{adventure}{title}"
