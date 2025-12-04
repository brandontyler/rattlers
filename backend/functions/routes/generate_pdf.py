"""Lambda function to generate a festive PDF route guide."""

import json
import os
import uuid
import math
from datetime import datetime, timezone
from io import BytesIO

import boto3
from botocore.exceptions import ClientError
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

s3_client = boto3.client("s3")

PHOTOS_BUCKET = os.environ.get("PHOTOS_BUCKET_NAME", "christmas-lights-photos-dev")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")
PDF_EXPIRATION_SECONDS = 3600  # 1 hour

# Christmas colors
BURGUNDY = colors.HexColor("#7f1d1d")
FOREST_GREEN = colors.HexColor("#166534")
GOLD = colors.HexColor("#ca8a04")
CREAM = colors.HexColor("#fefce8")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points in miles."""
    R = 3959  # Earth's radius in miles
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def calculate_route_stats(stops: list) -> dict:
    """Calculate total distance and estimated time for the route."""
    if len(stops) < 2:
        return {"total_distance": 0, "total_time": 0}

    total_distance = 0
    for i in range(len(stops) - 1):
        current = stops[i]
        next_stop = stops[i + 1]
        straight_line = haversine_distance(
            float(current["lat"]),
            float(current["lng"]),
            float(next_stop["lat"]),
            float(next_stop["lng"]),
        )
        # Apply road factor (roads aren't straight)
        total_distance += straight_line * 1.4

    # Estimate time: 25 mph average + 3 min viewing per stop
    driving_time = (total_distance / 25) * 60
    viewing_time = len(stops) * 3
    total_time = int(driving_time + viewing_time)

    return {
        "total_distance": round(total_distance, 1),
        "total_time": total_time,
    }


def format_duration(minutes: int) -> str:
    """Format minutes into a readable string."""
    if minutes < 60:
        return f"{minutes} min"
    hours = minutes // 60
    mins = minutes % 60
    if mins == 0:
        return f"{hours} hr"
    return f"{hours} hr {mins} min"


def create_pdf(stops: list) -> bytes:
    """Generate a festive PDF route guide."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    # Custom styles
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        fontSize=28,
        textColor=BURGUNDY,
        alignment=TA_CENTER,
        spaceAfter=6,
        fontName="Helvetica-Bold",
    )

    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontSize=14,
        textColor=FOREST_GREEN,
        alignment=TA_CENTER,
        spaceAfter=20,
    )

    stats_style = ParagraphStyle(
        "Stats",
        parent=styles["Normal"],
        fontSize=12,
        textColor=colors.gray,
        alignment=TA_CENTER,
        spaceAfter=20,
    )

    stop_title_style = ParagraphStyle(
        "StopTitle",
        parent=styles["Heading2"],
        fontSize=16,
        textColor=FOREST_GREEN,
        spaceBefore=15,
        spaceAfter=8,
        fontName="Helvetica-Bold",
    )

    address_style = ParagraphStyle(
        "Address",
        parent=styles["Normal"],
        fontSize=11,
        textColor=BURGUNDY,
        spaceAfter=6,
        fontName="Helvetica-Bold",
    )

    description_style = ParagraphStyle(
        "Description",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.black,
        spaceAfter=10,
        leading=14,
    )

    tips_title_style = ParagraphStyle(
        "TipsTitle",
        parent=styles["Heading3"],
        fontSize=12,
        textColor=GOLD,
        spaceBefore=20,
        spaceAfter=8,
        fontName="Helvetica-Bold",
    )

    tips_style = ParagraphStyle(
        "Tips",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.gray,
        spaceAfter=4,
        leftIndent=15,
    )

    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.gray,
        alignment=TA_CENTER,
        spaceBefore=30,
    )

    # Calculate stats
    stats = calculate_route_stats(stops)
    current_date = datetime.now().strftime("%B %d, %Y")

    # Build document content
    story = []

    # Header with decorative elements
    story.append(Paragraph("❄️ ⭐ ❄️ ⭐ ❄️ ⭐ ❄️ ⭐ ❄️", stats_style))
    story.append(Spacer(1, 10))

    # Title
    story.append(Paragraph("🎄 Christmas Lights Adventure 🎄", title_style))
    story.append(Paragraph("Your Family Route Guide", subtitle_style))

    # Stats line
    stats_text = f"{current_date}  •  ~{format_duration(stats['total_time'])}  •  {len(stops)} stops  •  {stats['total_distance']} miles"
    story.append(Paragraph(stats_text, stats_style))

    # Decorative line
    story.append(
        HRFlowable(
            width="100%",
            thickness=2,
            color=BURGUNDY,
            spaceBefore=10,
            spaceAfter=20,
        )
    )

    # Stops
    for i, stop in enumerate(stops):
        # Stop header
        story.append(Paragraph(f"⭐ Stop {i + 1}", stop_title_style))

        # Address
        address = stop.get("address", "Unknown Address")
        story.append(Paragraph(f"📍 {address}", address_style))

        # Rating (if available)
        rating = stop.get("averageRating", 0)
        if rating and rating > 0:
            stars = "★" * int(rating) + "☆" * (5 - int(rating))
            story.append(
                Paragraph(f"{stars} ({rating:.1f})", description_style)
            )

        # Description
        description = stop.get("description", "")
        if description:
            # Truncate long descriptions
            if len(description) > 300:
                description = description[:297] + "..."
            story.append(Paragraph(description, description_style))

        # Add separator between stops (except last)
        if i < len(stops) - 1:
            story.append(
                HRFlowable(
                    width="80%",
                    thickness=1,
                    color=colors.lightgrey,
                    spaceBefore=10,
                    spaceAfter=5,
                )
            )

    # Tips section
    story.append(
        HRFlowable(
            width="100%",
            thickness=2,
            color=FOREST_GREEN,
            spaceBefore=25,
            spaceAfter=15,
        )
    )

    story.append(Paragraph("💡 Tips for Your Trip", tips_title_style))

    tips = [
        "• Drive slowly through residential neighborhoods",
        "• Keep your headlights on low beam when viewing",
        "• Bring hot cocoa and holiday music for the family!",
        "• Respect private property and don't block driveways",
        "• Check local radio stations for synchronized music displays",
    ]

    for tip in tips:
        story.append(Paragraph(tip, tips_style))

    # Footer
    story.append(Spacer(1, 20))
    story.append(Paragraph("❄️ ⭐ ❄️ ⭐ ❄️ ⭐ ❄️ ⭐ ❄️", stats_style))
    story.append(
        Paragraph(
            "Created with DFW Christmas Lights Finder • christmaslights.example.com",
            footer_style,
        )
    )

    # Build the PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def handler(event, context):
    """Handle POST /routes/generate-pdf request."""

    # Handle preflight
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        # Parse request body
        body = json.loads(event.get("body", "{}"))
        stops = body.get("stops", [])

        # Validate
        if not stops or len(stops) == 0:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "At least one stop is required"}),
            }

        if len(stops) > 15:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"success": False, "message": "Maximum 15 stops allowed"}),
            }

        # Generate PDF
        pdf_bytes = create_pdf(stops)

        # Upload to S3
        pdf_key = f"pdfs/{uuid.uuid4()}.pdf"
        s3_client.put_object(
            Bucket=PHOTOS_BUCKET,
            Key=pdf_key,
            Body=pdf_bytes,
            ContentType="application/pdf",
            ContentDisposition='attachment; filename="christmas-lights-route.pdf"',
        )

        # Generate presigned download URL
        download_url = s3_client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": PHOTOS_BUCKET,
                "Key": pdf_key,
                "ResponseContentDisposition": 'attachment; filename="christmas-lights-route.pdf"',
            },
            ExpiresIn=PDF_EXPIRATION_SECONDS,
        )

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "success": True,
                "data": {
                    "downloadUrl": download_url,
                    "expiresIn": PDF_EXPIRATION_SECONDS,
                },
            }),
        }

    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Invalid JSON body"}),
        }
    except ClientError as e:
        print(f"S3 error: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Failed to generate PDF"}),
        }
    except Exception as e:
        print(f"Unexpected error: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"success": False, "message": "Internal server error"}),
        }
