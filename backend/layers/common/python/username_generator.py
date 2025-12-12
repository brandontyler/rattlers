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


def generate_christmas_username(inspiration: str) -> Optional[str]:
    """Generate an epic Christmas lights adventure username.

    Args:
        inspiration: User's name or email (used as creative inspiration)

    Returns:
        An epic Christmas-themed username, or None if generation fails
    """
    try:
        # Clean up the inspiration - could be a name like "BT Tyler" or email like "tyler@example.com"
        if "@" in inspiration:
            # It's an email, extract the prefix
            clean_inspiration = inspiration.split("@")[0]
        else:
            # It's a name - keep it as is for more creative possibilities!
            clean_inspiration = inspiration

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

Their name/identity for inspiration: {clean_inspiration}

Create ONE epic username that:
- Is FUN and makes people SMILE or LAUGH
- Sounds like someone who is OBSESSED with Christmas lights
- Uses creative word combinations (not just adjective+noun)
- Has personality and tells a story
- Incorporate their name creatively if possible!
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

Now create a UNIQUE, FUN username inspired by "{clean_inspiration}" - make it MEMORABLE!"""
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
        print(f"Error generating username for {inspiration}: {e}")
        return None


def generate_fallback_username(inspiration: str) -> str:
    """Generate a fun fallback username if Bedrock fails.

    Args:
        inspiration: User's name or email

    Returns:
        A fun Christmas-themed fallback username (no numbers!)
    """
    import random
    import hashlib

    # Handle both names and emails
    if "@" in inspiration:
        name_part = inspiration.split("@")[0]
    else:
        # It's a name - extract just alphanumeric chars
        name_part = inspiration
    
    # Clean and capitalize
    clean_name = "".join(c for c in name_part if c.isalnum())[:12]
    if clean_name:
        clean_name = clean_name[0].upper() + clean_name[1:].lower()

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

    # Use inspiration hash to consistently pick words (same input = same fallback)
    hash_val = int(hashlib.md5(inspiration.lower().encode()).hexdigest(), 16)

    # Different patterns for variety
    pattern = hash_val % 4

    if pattern == 0 and clean_name:
        # TinselTornado + Name style
        theme = themes[hash_val % len(themes)]
        return f"{theme}{adventures[hash_val % len(adventures)]}{clean_name}"
    elif pattern == 1 and clean_name:
        # Name + Title style
        title = titles[hash_val % len(titles)]
        theme = themes[(hash_val >> 4) % len(themes)]
        return f"{theme}{title}{clean_name}"
    elif pattern == 2:
        # Double theme style
        theme1 = themes[hash_val % len(themes)]
        theme2 = themes[(hash_val >> 4) % len(themes)]
        if theme1 == theme2:
            theme2 = adventures[hash_val % len(adventures)]
        return f"{theme1}{theme2}{'Hero' if clean_name else 'Legend'}"
    else:
        # Title + Adventure style
        title = titles[hash_val % len(titles)]
        adventure = adventures[(hash_val >> 4) % len(adventures)]
        return f"{themes[hash_val % len(themes)]}{adventure}{title}"
