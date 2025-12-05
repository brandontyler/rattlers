"""Lambda function to analyze uploaded photos using Bedrock Claude."""

import json
import os
import base64
import boto3
from botocore.exceptions import ClientError

bedrock = boto3.client("bedrock-runtime")
s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

suggestions_table = dynamodb.Table(os.environ.get("SUGGESTIONS_TABLE_NAME", "christmas-lights-suggestions-dev"))

DECORATION_TYPES = [
    "christmas lights",
    "christmas tree",
    "santa claus",
    "reindeer",
    "snowman",
    "wreath",
    "nativity scene",
    "candy canes",
    "nutcracker",
    "elf",
    "sleigh",
    "gingerbread house",
    "angel",
    "star",
    "penguin",
    "polar bear",
    "presents",
    "inflatables",
    "projections",
    "animated display",
]

# Tool definition for structured output
ANALYSIS_TOOL = {
    "name": "record_photo_analysis",
    "description": "Record the analysis results of a Christmas light display photo",
    "input_schema": {
        "type": "object",
        "properties": {
            "decorations": {
                "type": "array",
                "items": {"type": "string"},
                "description": "List of Christmas decorations detected in the photo",
            },
            "description": {
                "type": "string",
                "description": "A brief 1-2 sentence description of the display suitable for a listing",
            },
            "display_quality": {
                "type": "string",
                "enum": ["minimal", "moderate", "impressive", "spectacular"],
                "description": "Overall quality/scale of the display",
            },
            "is_christmas_display": {
                "type": "boolean",
                "description": "Whether this photo shows a legitimate Christmas light display",
            },
        },
        "required": ["decorations", "description", "display_quality", "is_christmas_display"],
    },
}


def handler(event, context):
    """Handle S3 trigger for photo uploads in pending/ prefix."""
    
    for record in event.get("Records", []):
        bucket = record["s3"]["bucket"]["name"]
        key = record["s3"]["object"]["key"]
        
        # Only process pending photos
        if not key.startswith("pending/"):
            continue
        
        # Extract suggestion ID from key: pending/{suggestionId}/{photoId}.ext
        parts = key.split("/")
        if len(parts) < 3:
            print(f"Unexpected key format: {key}")
            continue
        
        suggestion_id = parts[1]
        
        try:
            analysis = analyze_photo(bucket, key)
            update_suggestion_tags(suggestion_id, key, analysis)
        except Exception as e:
            print(f"Error analyzing {key}: {e}")
            continue
    
    return {"statusCode": 200}


def analyze_photo(bucket: str, key: str) -> dict:
    """Analyze photo using Bedrock Claude with tool use."""
    
    # Get image from S3
    obj = s3.get_object(Bucket=bucket, Key=key)
    image_bytes = obj["Body"].read()
    image_base64 = base64.b64encode(image_bytes).decode()
    
    # Determine media type
    content_type = obj.get("ContentType", "image/jpeg")
    if content_type not in ["image/jpeg", "image/png", "image/webp", "image/gif"]:
        content_type = "image/jpeg"
    
    response = bedrock.invoke_model(
        modelId="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 512,
            "tools": [ANALYSIS_TOOL],
            "tool_choice": {"type": "tool", "name": "record_photo_analysis"},
            "messages": [{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": content_type, "data": image_base64},
                    },
                    {
                        "type": "text",
                        "text": f"""Analyze this photo of a Christmas light display.

Identify decorations from this list (only include what you clearly see):
{', '.join(DECORATION_TYPES)}

Also provide:
- A brief description suitable for a listing (1-2 sentences, focus on what makes it special)
- The overall display quality (minimal/moderate/impressive/spectacular)
- Whether this is actually a Christmas display photo

Use the record_photo_analysis tool to submit your analysis.""",
                    },
                ],
            }],
        }),
    )
    
    result = json.loads(response["body"].read())
    
    # Extract tool use result
    for block in result.get("content", []):
        if block.get("type") == "tool_use" and block.get("name") == "record_photo_analysis":
            return block.get("input", {})
    
    return {"decorations": [], "description": "", "display_quality": "moderate", "is_christmas_display": True}


def update_suggestion_tags(suggestion_id: str, photo_key: str, analysis: dict):
    """Update suggestion record with photo analysis tags."""
    
    try:
        # Get current suggestion
        response = suggestions_table.get_item(
            Key={"PK": f"SUGGESTION#{suggestion_id}", "SK": "METADATA"}
        )
        suggestion = response.get("Item")
        
        if not suggestion:
            print(f"Suggestion {suggestion_id} not found")
            return
        
        # Merge new tags with existing
        existing_tags = set(suggestion.get("detectedTags", []))
        new_tags = set(analysis.get("decorations", []))
        merged_tags = list(existing_tags | new_tags)
        
        # Build update expression
        update_expr = "SET detectedTags = :tags"
        expr_values = {":tags": merged_tags}
        
        # Add AI description if not already set and this is a valid display
        if analysis.get("is_christmas_display") and analysis.get("description"):
            if not suggestion.get("aiDescription"):
                update_expr += ", aiDescription = :desc, displayQuality = :quality"
                expr_values[":desc"] = analysis["description"]
                expr_values[":quality"] = analysis.get("display_quality", "moderate")
        
        # Flag if not a Christmas display
        if not analysis.get("is_christmas_display"):
            update_expr += ", flaggedForReview = :flagged"
            expr_values[":flagged"] = True
        
        suggestions_table.update_item(
            Key={"PK": f"SUGGESTION#{suggestion_id}", "SK": "METADATA"},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
        )
        
        print(f"Updated suggestion {suggestion_id} with tags: {merged_tags}")
        
    except ClientError as e:
        print(f"DynamoDB error updating {suggestion_id}: {e}")
        raise
