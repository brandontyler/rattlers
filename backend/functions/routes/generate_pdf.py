"""Lambda function to generate a festive PDF route guide."""

import json
import os
import uuid
import math
from datetime import datetime
from io import BytesIO
from urllib.request import urlopen
from urllib.parse import quote

import boto3
from botocore.exceptions import ClientError
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    KeepTogether,
    PageBreak,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

s3_client = boto3.client("s3")

PHOTOS_BUCKET = os.environ.get("PHOTOS_BUCKET_NAME", "christmas-lights-photos-dev")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")
PDF_EXPIRATION_SECONDS = 3600

# Festive Christmas colors
DEEP_RED = colors.HexColor("#991b1b")
CHRISTMAS_RED = colors.HexColor("#dc2626")
FOREST_GREEN = colors.HexColor("#166534")
PINE_GREEN = colors.HexColor("#14532d")
GOLD = colors.HexColor("#ca8a04")
WARM_GOLD = colors.HexColor("#fbbf24")
CREAM = colors.HexColor("#fef3c7")
SNOW_WHITE = colors.HexColor("#fafafa")
SOFT_GRAY = colors.HexColor("#6b7280")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points in miles."""
    R = 3959
    lat1_rad, lat2_rad = math.radians(lat1), math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def calculate_route_stats(stops: list) -> dict:
    """Calculate total distance and estimated time for the route."""
    if len(stops) < 2:
        return {"total_distance": 0, "total_time": len(stops) * 3}
    
    total_distance = sum(
        haversine_distance(
            float(stops[i]["lat"]), float(stops[i]["lng"]),
            float(stops[i + 1]["lat"]), float(stops[i + 1]["lng"])
        ) * 1.4
        for i in range(len(stops) - 1)
    )
    driving_time = (total_distance / 25) * 60
    return {
        "total_distance": round(total_distance, 1),
        "total_time": int(driving_time + len(stops) * 3),
    }


def calculate_segment_distance(stop1: dict, stop2: dict) -> float:
    """Calculate distance between two consecutive stops."""
    return haversine_distance(
        float(stop1["lat"]), float(stop1["lng"]),
        float(stop2["lat"]), float(stop2["lng"])
    ) * 1.4


def format_duration(minutes: int) -> str:
    """Format minutes into a readable string."""
    if minutes < 60:
        return f"{minutes} min"
    hours, mins = divmod(minutes, 60)
    return f"{hours}h {mins}m" if mins else f"{hours}h"


def get_static_map_image(stops: list) -> BytesIO:
    """Generate a static map image using free staticmap service."""
    if not stops:
        return None
    
    lats = [float(s["lat"]) for s in stops]
    lngs = [float(s["lng"]) for s in stops]
    
    min_lat, max_lat = min(lats), max(lats)
    min_lng, max_lng = min(lngs), max(lngs)
    
    center_lat = (min_lat + max_lat) / 2
    center_lng = (min_lng + max_lng) / 2
    
    # Calculate zoom based on bounding box
    lat_diff = max_lat - min_lat
    lng_diff = max_lng - min_lng
    max_diff = max(lat_diff, lng_diff)
    
    if max_diff < 0.05:
        zoom = 14
    elif max_diff < 0.1:
        zoom = 13
    elif max_diff < 0.2:
        zoom = 12
    elif max_diff < 0.5:
        zoom = 11
    else:
        zoom = 10
    
    width, height = 600, 350
    
    try:
        # Use staticmap.openstreetmap.de - free, no API key
        # Build markers: color-label format
        markers_param = "|".join([
            f"{s['lng']},{s['lat']},ol-marker-green"
            for s in stops
        ])
        
        # Build path for route line
        path_param = "|".join([f"{s['lng']},{s['lat']}" for s in stops])
        
        map_url = (
            f"https://staticmap.openstreetmap.de/staticmap.php"
            f"?center={center_lat},{center_lng}"
            f"&zoom={zoom}"
            f"&size={width}x{height}"
            f"&maptype=mapnik"
            f"&markers={markers_param}"
        )
        
        with urlopen(map_url, timeout=15) as response:
            img_data = BytesIO(response.read())
            img_data.seek(0)
            return img_data
    except Exception as e:
        print(f"Map generation failed: {e}")
        # Try alternative: simple OSM tile approach
        try:
            # Fallback to a simpler static map
            alt_url = (
                f"https://www.openstreetmap.org/export/embed.html"
                f"?bbox={min_lng-0.02},{min_lat-0.02},{max_lng+0.02},{max_lat+0.02}"
                f"&layer=mapnik"
            )
            # This won't work as image, so return None
            return None
        except:
            return None


def generate_google_maps_url(stops: list) -> str:
    """Generate a Google Maps directions URL for a list of stops."""
    if len(stops) < 2:
        return f"https://www.google.com/maps/search/?api=1&query={stops[0]['lat']},{stops[0]['lng']}"
    
    origin = f"{stops[0]['lat']},{stops[0]['lng']}"
    destination = f"{stops[-1]['lat']},{stops[-1]['lng']}"
    
    if len(stops) > 2:
        waypoints = "|".join([f"{s['lat']},{s['lng']}" for s in stops[1:-1]])
        return f"https://www.google.com/maps/dir/?api=1&origin={origin}&destination={destination}&waypoints={quote(waypoints)}"
    
    return f"https://www.google.com/maps/dir/?api=1&origin={origin}&destination={destination}"


def chunk_stops_for_google_maps(stops: list, max_waypoints: int = 10) -> list:
    """Split stops into chunks that fit Google Maps URL limits.
    
    Google Maps allows: origin + up to 10 waypoints + destination = 12 stops per URL.
    We overlap by 1 stop so each chunk ends where the next begins.
    """
    if len(stops) <= max_waypoints + 2:  # Fits in one URL
        return [stops]
    
    chunks = []
    chunk_size = max_waypoints + 2  # origin + 10 waypoints + destination
    i = 0
    
    while i < len(stops):
        end = min(i + chunk_size, len(stops))
        chunks.append(stops[i:end])
        
        if end >= len(stops):
            break
        # Next chunk starts at current destination (overlap by 1)
        i = end - 1
    
    return chunks


def generate_qr_code(url: str) -> BytesIO:
    """Generate a QR code image for the given URL."""
    import qrcode
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer


def create_pdf(stops: list) -> bytes:
    """Generate a festive, professional PDF route guide."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.6 * inch,
        leftMargin=0.6 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )

    # Styles
    title_style = ParagraphStyle(
        "Title", fontSize=32, textColor=DEEP_RED, alignment=TA_CENTER,
        fontName="Helvetica-Bold", spaceAfter=4, leading=38,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle", fontSize=13, textColor=FOREST_GREEN, alignment=TA_CENTER,
        fontName="Helvetica-Oblique", spaceAfter=12,
    )
    date_style = ParagraphStyle(
        "Date", fontSize=11, textColor=SOFT_GRAY, alignment=TA_CENTER, spaceAfter=16,
    )
    section_header_style = ParagraphStyle(
        "SectionHeader", fontSize=14, textColor=PINE_GREEN, fontName="Helvetica-Bold",
        spaceBefore=16, spaceAfter=8, borderPadding=4,
    )
    stop_number_style = ParagraphStyle(
        "StopNumber", fontSize=18, textColor=CHRISTMAS_RED, fontName="Helvetica-Bold",
    )
    address_style = ParagraphStyle(
        "Address", fontSize=11, textColor=colors.black, fontName="Helvetica-Bold",
        spaceAfter=3, leading=14,
    )
    description_style = ParagraphStyle(
        "Description", fontSize=10, textColor=SOFT_GRAY, spaceAfter=2, leading=13,
    )
    distance_style = ParagraphStyle(
        "Distance", fontSize=9, textColor=FOREST_GREEN, alignment=TA_CENTER,
        spaceBefore=6, spaceAfter=6, fontName="Helvetica-Oblique",
    )
    tip_style = ParagraphStyle(
        "Tip", fontSize=10, textColor=SOFT_GRAY, leftIndent=15, spaceAfter=4, leading=13,
    )
    footer_style = ParagraphStyle(
        "Footer", fontSize=9, textColor=SOFT_GRAY, alignment=TA_CENTER, spaceBefore=20,
    )
    stats_style = ParagraphStyle(
        "Stats", fontSize=11, textColor=colors.black, alignment=TA_CENTER,
    )

    stats = calculate_route_stats(stops)
    current_date = datetime.now().strftime("%A, %B %d, %Y")
    
    story = []

    # ===== HEADER SECTION =====
    # Decorative top border
    story.append(Paragraph(
        '<font color="#166534">✦</font> · '
        '<font color="#dc2626">✦</font> · '
        '<font color="#ca8a04">✦</font> · '
        '<font color="#166534">✦</font> · '
        '<font color="#dc2626">✦</font> · '
        '<font color="#ca8a04">✦</font> · '
        '<font color="#166534">✦</font> · '
        '<font color="#dc2626">✦</font> · '
        '<font color="#ca8a04">✦</font>',
        ParagraphStyle("Decor", fontSize=16, alignment=TA_CENTER, spaceAfter=12)
    ))
    
    # Title
    story.append(Paragraph("Christmas Lights Adventure", title_style))
    story.append(Paragraph("~ Your Family Route Guide ~", subtitle_style))
    story.append(Paragraph(current_date, date_style))

    # ===== STATS BOX =====
    stats_data = [[
        Paragraph(f'<font color="#166534"><b>{len(stops)}</b></font><br/><font size="9">Stops</font>', 
                  ParagraphStyle("s", alignment=TA_CENTER, leading=14)),
        Paragraph(f'<font color="#991b1b"><b>{stats["total_distance"]}</b></font><br/><font size="9">Miles</font>', 
                  ParagraphStyle("s", alignment=TA_CENTER, leading=14)),
        Paragraph(f'<font color="#ca8a04"><b>~{format_duration(stats["total_time"])}</b></font><br/><font size="9">Total Time</font>', 
                  ParagraphStyle("s", alignment=TA_CENTER, leading=14)),
    ]]
    
    stats_table = Table(stats_data, colWidths=[2.2*inch, 2.2*inch, 2.2*inch])
    stats_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, -1), CREAM),
        ('BOX', (0, 0), (-1, -1), 1, GOLD),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(stats_table)
    story.append(Spacer(1, 12))

    # ===== MAP IMAGE =====
    map_image = get_static_map_image(stops)
    if map_image:
        try:
            img = Image(map_image, width=6.8*inch, height=3.5*inch)
            img.hAlign = 'CENTER'
            
            # Wrap map in a table for border
            map_table = Table([[img]], colWidths=[7*inch])
            map_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('BOX', (0, 0), (-1, -1), 2, FOREST_GREEN),
                ('BACKGROUND', (0, 0), (-1, -1), SNOW_WHITE),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(map_table)
            story.append(Spacer(1, 8))
        except Exception as e:
            print(f"Failed to add map image: {e}")
    
    # ===== QR CODES FOR GOOGLE MAPS =====
    route_chunks = chunk_stops_for_google_maps(stops)
    
    if len(route_chunks) == 1:
        # Single QR code for the whole route
        story.append(Paragraph("Scan for Google Maps Directions", section_header_style))
        qr_line = Table([[""]], colWidths=[6.8*inch])
        qr_line.setStyle(TableStyle([('LINEABOVE', (0, 0), (-1, 0), 2, FOREST_GREEN)]))
        story.append(qr_line)
        story.append(Spacer(1, 8))
        
        maps_url = generate_google_maps_url(stops)
        try:
            qr_img = Image(generate_qr_code(maps_url), width=1.5*inch, height=1.5*inch)
            qr_table = Table([
                [qr_img, Paragraph(
                    f'<font color="#166534"><b>Scan with your phone</b></font><br/>'
                    f'<font color="#6b7280" size="9">Opens Google Maps with<br/>turn-by-turn directions<br/>for all {len(stops)} stops</font>',
                    ParagraphStyle("qr", alignment=TA_LEFT, leading=14)
                )]
            ], colWidths=[1.8*inch, 4.5*inch])
            qr_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (1, 0), (1, 0), 15),
            ]))
            story.append(qr_table)
        except Exception as e:
            print(f"Failed to generate QR code: {e}")
            story.append(Paragraph(
                f'<font color="#6b7280" size="9">Google Maps: {maps_url[:60]}...</font>',
                ParagraphStyle("url", alignment=TA_CENTER)
            ))
    else:
        # Multiple QR codes for long routes
        story.append(Paragraph("Scan for Google Maps Directions", section_header_style))
        qr_line = Table([[""]], colWidths=[6.8*inch])
        qr_line.setStyle(TableStyle([('LINEABOVE', (0, 0), (-1, 0), 2, FOREST_GREEN)]))
        story.append(qr_line)
        story.append(Spacer(1, 4))
        
        story.append(Paragraph(
            f'<font color="#6b7280" size="9">Your route has {len(stops)} stops. '
            f'Scan each QR code in order for turn-by-turn directions.</font>',
            ParagraphStyle("note", alignment=TA_CENTER, spaceAfter=8)
        ))
        
        # Build QR codes row
        qr_cells = []
        for i, chunk in enumerate(route_chunks):
            maps_url = generate_google_maps_url(chunk)
            start_stop = sum(len(route_chunks[j]) - 1 for j in range(i)) + 1
            end_stop = start_stop + len(chunk) - 1
            
            try:
                qr_img = Image(generate_qr_code(maps_url), width=1.2*inch, height=1.2*inch)
                qr_cell = Table([
                    [qr_img],
                    [Paragraph(
                        f'<font color="#166534" size="9"><b>Part {i+1}</b></font><br/>'
                        f'<font color="#6b7280" size="8">Stops {start_stop}-{end_stop}</font>',
                        ParagraphStyle("qrlabel", alignment=TA_CENTER, leading=11)
                    )]
                ])
                qr_cell.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ]))
                qr_cells.append(qr_cell)
            except Exception as e:
                print(f"Failed to generate QR code {i+1}: {e}")
                qr_cells.append(Paragraph(f'Part {i+1}', ParagraphStyle("err", alignment=TA_CENTER)))
        
        # Arrange QR codes in a row (up to 4 per row)
        if len(qr_cells) <= 4:
            col_width = 6.8 * inch / len(qr_cells)
            qr_row_table = Table([qr_cells], colWidths=[col_width] * len(qr_cells))
            qr_row_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(qr_row_table)
        else:
            # Two rows if more than 4 chunks
            row1 = qr_cells[:4]
            row2 = qr_cells[4:]
            col_width = 6.8 * inch / 4
            qr_table = Table([row1, row2 + [None] * (4 - len(row2))], colWidths=[col_width] * 4)
            qr_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(qr_table)
    
    story.append(Spacer(1, 12))
    
    # ===== ROUTE STOPS =====
    story.append(Paragraph("Your Route", section_header_style))
    
    # Decorative line
    line_table = Table([[""]], colWidths=[6.8*inch])
    line_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 2, CHRISTMAS_RED),
    ]))
    story.append(line_table)
    story.append(Spacer(1, 8))

    for i, stop in enumerate(stops):
        stop_elements = []
        
        # Stop number and address in a nice layout
        address = stop.get("address", "Unknown Address")
        # Truncate long addresses
        if len(address) > 60:
            address = address[:57] + "..."
        
        # Rating stars
        rating = stop.get("averageRating", 0)
        if rating and rating > 0:
            full_stars = int(rating)
            stars_display = '<font color="#ca8a04">' + "★" * full_stars + "☆" * (5 - full_stars) + '</font>'
            rating_text = f'  {stars_display} <font size="9" color="#6b7280">({rating:.1f})</font>'
        else:
            rating_text = ""
        
        # Build stop row
        stop_content = [
            [
                Paragraph(f'<font color="#dc2626" size="20"><b>{i + 1}</b></font>', 
                          ParagraphStyle("num", alignment=TA_CENTER)),
                Paragraph(
                    f'<font size="11"><b>{address}</b></font>{rating_text}',
                    ParagraphStyle("addr", leading=14)
                ),
            ]
        ]
        
        stop_table = Table(stop_content, colWidths=[0.5*inch, 6.3*inch])
        stop_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (0, 0), 0),
            ('RIGHTPADDING', (0, 0), (0, 0), 8),
        ]))
        stop_elements.append(stop_table)
        
        # Description (if available)
        description = stop.get("description", "")
        if description:
            if len(description) > 150:
                description = description[:147] + "..."
            stop_elements.append(Paragraph(
                f'<font color="#6b7280">{description}</font>',
                ParagraphStyle("desc", fontSize=10, leftIndent=36, spaceAfter=4, leading=13)
            ))
        
        # Distance to next stop
        if i < len(stops) - 1:
            dist = calculate_segment_distance(stop, stops[i + 1])
            drive_time = int((dist / 25) * 60) + 1
            stop_elements.append(Spacer(1, 6))
            stop_elements.append(Paragraph(
                f'<font color="#166534">↓ {dist:.1f} mi · ~{drive_time} min drive</font>',
                ParagraphStyle("dist", fontSize=9, alignment=TA_CENTER, textColor=FOREST_GREEN)
            ))
            stop_elements.append(Spacer(1, 6))
        else:
            stop_elements.append(Spacer(1, 8))
        
        # Keep stop together on same page
        story.append(KeepTogether(stop_elements))

    # ===== TIPS SECTION =====
    story.append(Spacer(1, 12))
    story.append(Paragraph("Tips for Your Adventure", section_header_style))
    
    tips_line = Table([[""]], colWidths=[6.8*inch])
    tips_line.setStyle(TableStyle([('LINEABOVE', (0, 0), (-1, 0), 2, GOLD)]))
    story.append(tips_line)
    story.append(Spacer(1, 8))

    tips = [
        ("🚗", "Drive slowly through neighborhoods — enjoy the view!"),
        ("☕", "Bring hot cocoa and holiday music for the family"),
        ("📸", "Capture memories — but stay safe, don't block traffic"),
        ("🎵", "Tune to 100.3 FM for houses with synchronized music"),
        ("⏰", "Best viewing is after 6 PM when it's fully dark"),
    ]
    
    for emoji, tip in tips:
        story.append(Paragraph(f'{emoji}  {tip}', tip_style))

    # ===== FOOTER =====
    story.append(Spacer(1, 16))
    story.append(Paragraph(
        '<font color="#166534">✦</font> · '
        '<font color="#dc2626">✦</font> · '
        '<font color="#ca8a04">✦</font> · '
        '<font color="#166534">✦</font> · '
        '<font color="#dc2626">✦</font>',
        ParagraphStyle("FooterDecor", fontSize=12, alignment=TA_CENTER, spaceAfter=8)
    ))
    story.append(Paragraph(
        "Have a magical Christmas lights adventure!",
        ParagraphStyle("Magic", fontSize=12, textColor=DEEP_RED, alignment=TA_CENTER, 
                       fontName="Helvetica-Oblique", spaceAfter=4)
    ))
    story.append(Paragraph(
        "Created with DFW Christmas Lights Finder",
        footer_style
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def handler(event, context):
    """Handle POST /routes/generate-pdf request."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        body = json.loads(event.get("body", "{}"))
        stops = body.get("stops", [])

        if not stops:
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

        pdf_bytes = create_pdf(stops)

        pdf_key = f"pdfs/{uuid.uuid4()}.pdf"
        s3_client.put_object(
            Bucket=PHOTOS_BUCKET,
            Key=pdf_key,
            Body=pdf_bytes,
            ContentType="application/pdf",
            ContentDisposition='attachment; filename="christmas-lights-route.pdf"',
        )

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
                "data": {"downloadUrl": download_url, "expiresIn": PDF_EXPIRATION_SECONDS},
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
