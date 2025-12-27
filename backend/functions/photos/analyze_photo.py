"""Lambda function to analyze uploaded photos using Amazon Nova Pro."""

import json
import os
import base64
import io
import time
import random
import boto3
from botocore.exceptions import ClientError
from PIL import Image

bedrock = boto3.client("bedrock-runtime")
s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

suggestions_table = dynamodb.Table(os.environ.get("SUGGESTIONS_TABLE_NAME", "christmas-lights-suggestions-dev"))

# Tool definition for structured output
ANALYSIS_TOOL = {
    "name": "record_photo_analysis",
    "description": "Record the analysis results of a Christmas light display photo",
    "input_schema": {
        "type": "object",
        "properties": {
            "featured_items": {
                "type": "array",
                "items": {"type": "string"},
                "maxItems": 8,
                "description": "List 5-8 featured items visitors will see at this display. Be specific and descriptive.",
            },
            "description": {
                "type": "string",
                "description": "One natural sentence summarizing what makes this display special.",
            },
            "display_quality": {
                "type": "string",
                "enum": ["minimal", "moderate", "impressive", "spectacular"],
                "description": "Overall display quality based on scale, variety, and visual impact",
            },
            "is_christmas_display": {
                "type": "boolean",
                "description": "Whether this photo shows a legitimate Christmas/holiday light display",
            },
        },
        "required": ["featured_items", "description", "display_quality", "is_christmas_display"],
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

        try:
            # Compress photo if needed
            compress_photo_if_needed(bucket, key)
            
            # Find suggestion that contains this photo key
            suggestion = find_suggestion_by_photo_key(key)
            if not suggestion:
                print(f"No suggestion found containing photo: {key}")
                continue
            
            suggestion_id = suggestion.get("id")
            
            # Analyze photo
            analysis = analyze_photo(bucket, key)
            update_suggestion_tags(suggestion_id, key, analysis)
        except Exception as e:
            print(f"Error processing {key}: {e}")
            continue

    return {"statusCode": 200}


def find_suggestion_by_photo_key(photo_key: str) -> dict | None:
    """Find a suggestion that contains the given photo key."""
    try:
        # Scan for suggestions with this photo key
        # Note: For production scale, consider a GSI on photo keys
        response = suggestions_table.scan(
            FilterExpression="contains(photos, :key) AND #status = :status",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={":key": photo_key, ":status": "pending"},
        )
        items = response.get("Items", [])
        return items[0] if items else None
    except Exception as e:
        print(f"Error finding suggestion for {photo_key}: {e}")
        return None


def compress_photo_if_needed(bucket: str, key: str):
    """Compress photo if it's too large or high resolution."""

    # Target: max 2MB file size, max 2000px width/height
    MAX_SIZE_BYTES = 2 * 1024 * 1024  # 2MB
    MAX_DIMENSION = 2000  # pixels
    JPEG_QUALITY = 85  # Good quality while reducing size

    try:
        # Get current object
        obj = s3.get_object(Bucket=bucket, Key=key)
        original_size = obj["ContentLength"]
        image_bytes = obj["Body"].read()
        content_type = obj.get("ContentType", "image/jpeg")

        print(f"Original photo: {key}, size: {original_size / (1024*1024):.2f}MB, type: {content_type}")

        # Skip if already small enough and not HEIC/HEIF
        if original_size <= MAX_SIZE_BYTES and content_type not in ["image/heic", "image/heif"]:
            print(f"Photo already optimal size, skipping compression")
            return

        # Open image with Pillow
        image = Image.open(io.BytesIO(image_bytes))

        # Apply EXIF orientation (fixes upside-down iPhone photos)
        from PIL import ImageOps
        image = ImageOps.exif_transpose(image)

        # Convert RGBA to RGB if needed (for JPEG)
        if image.mode in ("RGBA", "LA", "P"):
            # Create white background
            background = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "P":
                image = image.convert("RGBA")
            background.paste(image, mask=image.split()[-1] if image.mode in ("RGBA", "LA") else None)
            image = background
        elif image.mode != "RGB":
            image = image.convert("RGB")

        # Get original dimensions
        width, height = image.size
        print(f"Original dimensions: {width}x{height}")

        # Resize if too large
        if width > MAX_DIMENSION or height > MAX_DIMENSION:
            ratio = min(MAX_DIMENSION / width, MAX_DIMENSION / height)
            new_width = int(width * ratio)
            new_height = int(height * ratio)
            print(f"Resizing to: {new_width}x{new_height}")
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Compress to JPEG
        output = io.BytesIO()
        image.save(output, format="JPEG", quality=JPEG_QUALITY, optimize=True)
        compressed_bytes = output.getvalue()
        compressed_size = len(compressed_bytes)

        print(f"Compressed size: {compressed_size / (1024*1024):.2f}MB (saved {(original_size - compressed_size) / (1024*1024):.2f}MB)")

        # Only save if we actually reduced the size
        if compressed_size < original_size:
            # Upload compressed version back to S3
            s3.put_object(
                Bucket=bucket,
                Key=key,
                Body=compressed_bytes,
                ContentType="image/jpeg",
                Metadata=obj.get("Metadata", {}),
            )
            print(f"Successfully compressed and saved photo")
        else:
            print(f"Compression didn't reduce size, keeping original")

    except Exception as e:
        print(f"Error compressing photo {key}: {e}")
        # Don't fail the whole process if compression fails
        pass


def analyze_photo(bucket: str, key: str) -> dict:
    """Analyze photo using Amazon Nova Pro with tool use."""

    # Get image from S3
    obj = s3.get_object(Bucket=bucket, Key=key)
    image_bytes = obj["Body"].read()
    image_base64 = base64.b64encode(image_bytes).decode()

    # Determine media type - Nova uses format without "image/" prefix
    content_type = obj.get("ContentType", "image/jpeg")
    format_map = {
        "image/jpeg": "jpeg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
    }
    image_format = format_map.get(content_type, "jpeg")

    # Build the prompt
    prompt_text = """Analyze this Christmas display photo.

**FEATURED ITEMS** - List 5-8 things visitors will see at this display.
- Be specific: "giant Grinch inflatable" not just "inflatable"
- Include notable items: inflatables, light displays, yard decorations, animated figures
- Focus on what makes this display interesting

**DESCRIPTION** - One sentence describing what makes this display special.

**DISPLAY QUALITY** - Rate based on these criteria:
- minimal: Basic lights or a few simple decorations
- moderate: Nice effort with multiple decoration types, above average for the neighborhood
- impressive: Stands out significantly, worth driving to see, lots of variety and scale
- spectacular: Destination-worthy, exceptional scale/creativity, the kind people post about online

Use the record_photo_analysis tool."""

    # Build Nova tool config from ANALYSIS_TOOL
    nova_tool_config = {
        "tools": [{
            "toolSpec": {
                "name": ANALYSIS_TOOL["name"],
                "description": ANALYSIS_TOOL["description"],
                "inputSchema": {
                    "json": ANALYSIS_TOOL["input_schema"]
                }
            }
        }],
        "toolChoice": {
            "tool": {
                "name": ANALYSIS_TOOL["name"]
            }
        }
    }

    # Retry with exponential backoff for rate limiting
    max_retries = 5
    base_delay = 1.0

    for attempt in range(max_retries):
        try:
            response = bedrock.invoke_model(
                modelId="us.amazon.nova-pro-v1:0",
                body=json.dumps({
                    "messages": [{
                        "role": "user",
                        "content": [
                            {
                                "image": {
                                    "format": image_format,
                                    "source": {
                                        "bytes": image_base64
                                    }
                                }
                            },
                            {
                                "text": prompt_text
                            },
                        ],
                    }],
                    "toolConfig": nova_tool_config,
                    "inferenceConfig": {
                        "maxTokens": 512
                    }
                }),
            )

            result = json.loads(response["body"].read())

            # Extract tool use result from Nova response format
            output = result.get("output", {})
            message = output.get("message", {})
            for block in message.get("content", []):
                if "toolUse" in block:
                    tool_use = block["toolUse"]
                    if tool_use.get("name") == "record_photo_analysis":
                        return tool_use.get("input", {})

            return {"featured_items": [], "description": "", "display_quality": "moderate", "is_christmas_display": True}

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code in ("ServiceUnavailableException", "ThrottlingException") and attempt < max_retries - 1:
                # Exponential backoff with jitter
                delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                print(f"Bedrock rate limited, retrying in {delay:.1f}s (attempt {attempt + 1}/{max_retries})")
                time.sleep(delay)
                continue
            raise

    return {"featured_items": [], "description": "", "display_quality": "moderate", "is_christmas_display": True}


def deduplicate_tags_semantically(tags: list[str]) -> list[str]:
    """Remove semantic duplicates, keeping more specific/descriptive tags.

    Examples:
    - ["snowman figures", "inflatable snowmen"] -> ["inflatable snowmen"]
    - ["reindeer figures", "white reindeer figures"] -> ["white reindeer figures"]
    - ["word signs", "JOY signs"] -> ["word signs", "JOY signs"]  # Different enough
    - ["gingerbread inflatables", "inflatable snowmen"] -> both kept  # Different items
    """
    if len(tags) <= 1:
        return tags

    tags_to_remove = set()

    for i, tag_i in enumerate(tags):
        if tag_i in tags_to_remove:
            continue

        for j, tag_j in enumerate(tags):
            if i >= j or tag_j in tags_to_remove:
                continue

            words_i = set(tag_i.lower().split())
            words_j = set(tag_j.lower().split())

            # Strategy 1: If one tag's words are a proper subset of another, remove the less specific one
            # E.g., "reindeer figures" ⊂ "white reindeer figures"
            if words_i < words_j:  # i is proper subset of j
                tags_to_remove.add(tag_i)
                break
            elif words_j < words_i:  # j is proper subset of i
                tags_to_remove.add(tag_j)
                continue

            # Strategy 2: Check for plural/singular variations of the SAME item
            # Only consider stem matching if the tags are otherwise similar (share other words or are short)
            overlap = words_i & words_j
            min_words = min(len(words_i), len(words_j))

            # Only apply stem matching if:
            # - Tags share at least one word already (some overlap), OR
            # - Both tags are 2 words or less (short tags more likely to be variations)
            if overlap or (len(words_i) <= 2 and len(words_j) <= 2):
                # Find stem matches (e.g., "snowman" vs "snowmen")
                # Only check words that don't already have exact matches
                unmatched_i = words_i - overlap
                unmatched_j = words_j - overlap

                stem_matches = 0
                for word_i in unmatched_i:
                    for word_j in unmatched_j:
                        if len(word_i) >= 4 and len(word_j) >= 4:
                            min_len = min(len(word_i), len(word_j))
                            prefix_len = max(4, int(min_len * 0.7))
                            if word_i[:prefix_len] == word_j[:prefix_len]:
                                stem_matches += 1
                                break

                # If we found stem matches AND tags are very similar, consider them duplicates
                # Use conservative threshold to avoid false positives:
                # - Don't merge "penguin figures" vs "snowman figures" (only share "figures")
                # - Don't merge "inflatable snowmen" vs "gingerbread inflatables" (different objects)
                # - DO merge "word signs" vs "WORD SIGNS" (same thing, case variation)
                total_matches = len(overlap) + stem_matches
                similarity_ratio = total_matches / min_words

                # Conservative: require 100% of shorter tag's words to match
                if similarity_ratio == 1.0 and total_matches >= 2:
                    # Keep the longer/more descriptive tag
                    if len(tag_i) > len(tag_j):
                        tags_to_remove.add(tag_j)
                    else:
                        tags_to_remove.add(tag_i)
                        break

    result = [tag for tag in tags if tag not in tags_to_remove]
    return sorted(result)  # Sort for consistency


def update_suggestion_tags(suggestion_id: str, photo_key: str, analysis: dict):
    """Update suggestion record with photo analysis - featured items, description, quality."""

    try:
        # Get current suggestion
        response = suggestions_table.get_item(
            Key={"PK": f"SUGGESTION#{suggestion_id}", "SK": "METADATA"}
        )
        suggestion = response.get("Item")

        if not suggestion:
            print(f"Suggestion {suggestion_id} not found")
            return

        # Merge new featured items with existing
        existing_items = set(suggestion.get("detectedTags", []))
        new_items = set(analysis.get("featured_items", []))
        merged_items = list(existing_items | new_items)

        # Apply semantic deduplication to remove redundant variations
        merged_items = deduplicate_tags_semantically(merged_items)

        # Hard cap at 10 items to keep UI clean
        if len(merged_items) > 10:
            merged_items = merged_items[:10]

        # Build update expression
        update_expr = "SET detectedTags = :tags"
        expr_values = {
            ":tags": merged_items,
        }

        # Use AI-generated description directly
        if analysis.get("is_christmas_display"):
            ai_description = analysis.get("description", "")
            if ai_description and (not suggestion.get("aiDescription") or len(ai_description) > len(suggestion.get("aiDescription", ""))):
                update_expr += ", aiDescription = :desc"
                expr_values[":desc"] = ai_description

            # Track the highest quality level across all photos
            quality_levels = {"minimal": 1, "moderate": 2, "impressive": 3, "spectacular": 4}
            new_quality = analysis.get("display_quality", "moderate")
            existing_quality = suggestion.get("displayQuality", "minimal")

            if quality_levels.get(new_quality, 0) > quality_levels.get(existing_quality, 0):
                update_expr += ", displayQuality = :quality"
                expr_values[":quality"] = new_quality

        # Flag if not a Christmas display
        if not analysis.get("is_christmas_display"):
            update_expr += ", flaggedForReview = :flagged"
            expr_values[":flagged"] = True

        suggestions_table.update_item(
            Key={"PK": f"SUGGESTION#{suggestion_id}", "SK": "METADATA"},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
        )

        print(f"Updated suggestion {suggestion_id}:")
        print(f"  - Featured items: {merged_items}")
        print(f"  - Quality: {analysis.get('display_quality')}")

    except ClientError as e:
        print(f"DynamoDB error updating {suggestion_id}: {e}")
        raise
