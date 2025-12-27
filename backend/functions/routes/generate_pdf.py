"""Lambda function to generate an elegant PDF route guide."""

import json
import os
import uuid
import math
from datetime import datetime
from io import BytesIO
from urllib.request import urlopen, Request
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
    HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

s3_client = boto3.client("s3")

PHOTOS_BUCKET = os.environ.get("PHOTOS_BUCKET_NAME", "christmas-lights-photos-dev")
PDF_EXPIRATION_SECONDS = 3600


def get_allowed_origins() -> list:
    origins_str = os.environ.get("ALLOWED_ORIGINS", "")
    if origins_str:
        return [o.strip() for o in origins_str.split(",") if o.strip()]
    single = os.environ.get("ALLOWED_ORIGIN", "")
    return [single] if single else ["*"]


def get_cors_headers(event: dict) -> dict:
    origin = event.get("headers", {}).get("origin") or event.get("headers", {}).get("Origin", "")
    allowed = get_allowed_origins()
    cors_origin = origin if origin in allowed else allowed[0]
    return {
        "Access-Control-Allow-Origin": cors_origin,
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
    }


# Elegant color palette
DARK_GREEN = colors.HexColor("#15803d")
RICH_RED = colors.HexColor("#b91c1c")
WARM_GOLD = colors.HexColor("#b45309")
CHARCOAL = colors.HexColor("#374151")
MEDIUM_GRAY = colors.HexColor("#6b7280")
LIGHT_GRAY = colors.HexColor("#e5e7eb")
OFF_WHITE = colors.HexColor("#f9fafb")


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 3959
    lat1_rad, lat2_rad = math.radians(lat1), math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def calculate_route_stats(stops: list) -> dict:
    if len(stops) < 2:
        return {"total_distance": 0, "total_time": len(stops) * 5}
    total_distance = sum(
        haversine_distance(
            float(stops[i]["lat"]), float(stops[i]["lng"]),
            float(stops[i + 1]["lat"]), float(stops[i + 1]["lng"])
        ) * 1.3
        for i in range(len(stops) - 1)
    )
    driving_time = (total_distance / 20) * 60  # Slower speed for neighborhoods
    return {
        "total_distance": round(total_distance, 1),
        "total_time": int(driving_time + len(stops) * 5),  # 5 min per stop to enjoy
    }


def calculate_segment_distance(stop1: dict, stop2: dict) -> float:
    return haversine_distance(
        float(stop1["lat"]), float(stop1["lng"]),
        float(stop2["lat"]), float(stop2["lng"])
    ) * 1.3


def format_duration(minutes: int) -> str:
    if minutes < 60:
        return f"{minutes} min"
    hours, mins = divmod(minutes, 60)
    return f"{hours}h {mins}m" if mins else f"{hours}h"


def get_static_map_url(stops: list) -> str:
    """Generate a static map URL using OpenStreetMap."""
    if not stops:
        return None
    
    lats = [float(s["lat"]) for s in stops]
    lngs = [float(s["lng"]) for s in stops]
    
    center_lat = (min(lats) + max(lats)) / 2
    center_lng = (min(lngs) + max(lngs)) / 2
    
    max_diff = max(max(lats) - min(lats), max(lngs) - min(lngs))
    zoom = 14 if max_diff < 0.03 else 13 if max_diff < 0.08 else 12 if max_diff < 0.15 else 11 if max_diff < 0.4 else 10
    
    # Build marker string for each stop with numbers
    markers = []
    for i, s in enumerate(stops):
        markers.append(f"{s['lng']},{s['lat']},lightblue{i+1}")
    
    markers_param = "|".join(markers)
    
    return (
        f"https://staticmap.openstreetmap.de/staticmap.php"
        f"?center={center_lat},{center_lng}"
        f"&zoom={zoom}"
        f"&size=640x360"
        f"&maptype=mapnik"
        f"&markers={markers_param}"
    )


def fetch_map_image(stops: list) -> BytesIO:
    """Fetch static map image with proper headers."""
    url = get_static_map_url(stops)
    if not url:
        return None
    
    try:
        req = Request(url, headers={'User-Agent': 'DFWChristmasLights/1.0'})
        with urlopen(req, timeout=10) as response:
            img_data = BytesIO(response.read())
            img_data.seek(0)
            return img_data
    except Exception as e:
        print(f"Map fetch failed: {e}")
        return None


def generate_google_maps_url(stops: list) -> str:
    if len(stops) < 2:
        return f"https://www.google.com/maps/search/?api=1&query={stops[0]['lat']},{stops[0]['lng']}"
    origin = f"{stops[0]['lat']},{stops[0]['lng']}"
    destination = f"{stops[-1]['lat']},{stops[-1]['lng']}"
    if len(stops) > 2:
        waypoints = "|".join([f"{s['lat']},{s['lng']}" for s in stops[1:-1]])
        return f"https://www.google.com/maps/dir/?api=1&origin={origin}&destination={destination}&waypoints={quote(waypoints)}"
    return f"https://www.google.com/maps/dir/?api=1&origin={origin}&destination={destination}"


def generate_apple_maps_url(stop: dict, prev_stop: dict = None) -> str:
    """
    Generate Apple Maps URL for a single destination.
    Note: Apple Maps URL scheme does NOT support multiple waypoints.
    Users navigate stop-by-stop.
    """
    url = f"https://maps.apple.com/?daddr={stop['lat']},{stop['lng']}"
    if prev_stop:
        url += f"&saddr={prev_stop['lat']},{prev_stop['lng']}"
    url += "&dirflg=d"  # Driving mode
    return url


def generate_waze_url(stop: dict) -> str:
    """
    Generate Waze deep link URL for a single destination.
    Note: Waze deep links do NOT support multiple waypoints.
    Users navigate stop-by-stop.
    """
    return f"https://waze.com/ul?ll={stop['lat']},{stop['lng']}&navigate=yes"


def chunk_stops_for_google_maps(stops: list, max_waypoints: int = 10) -> list:
    if len(stops) <= max_waypoints + 2:
        return [stops]
    chunks = []
    chunk_size = max_waypoints + 2
    i = 0
    while i < len(stops):
        end = min(i + chunk_size, len(stops))
        chunks.append(stops[i:end])
        if end >= len(stops):
            break
        i = end - 1
    return chunks


def generate_qr_code(url: str) -> BytesIO:
    import qrcode
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1f2937", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer


def create_pdf(stops: list) -> bytes:
    """Generate an elegant, clean PDF route guide."""
    buffer = BytesIO()
    stats = calculate_route_stats(stops)
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.7 * inch,
        leftMargin=0.7 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
    )

    # Clean, professional styles
    title_style = ParagraphStyle(
        "Title", fontSize=26, textColor=CHARCOAL, alignment=TA_CENTER,
        fontName="Helvetica-Bold", spaceAfter=12, leading=32,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle", fontSize=11, textColor=MEDIUM_GRAY, alignment=TA_CENTER,
        fontName="Helvetica", spaceAfter=20,
    )
    section_style = ParagraphStyle(
        "Section", fontSize=14, textColor=DARK_GREEN, fontName="Helvetica-Bold",
        spaceBefore=16, spaceAfter=8,
    )
    body_style = ParagraphStyle(
        "Body", fontSize=10, textColor=CHARCOAL, leading=14,
    )
    small_style = ParagraphStyle(
        "Small", fontSize=9, textColor=MEDIUM_GRAY, leading=12,
    )
    footer_style = ParagraphStyle(
        "Footer", fontSize=8, textColor=MEDIUM_GRAY, alignment=TA_CENTER,
    )

    current_date = datetime.now().strftime("%B %d, %Y")
    story = []

    # === HEADER ===
    story.append(Paragraph("Your Christmas Lights Route", title_style))
    story.append(Paragraph(f"{len(stops)} stops · {stats['total_distance']} miles · ~{format_duration(stats['total_time'])}", subtitle_style))

    # === ROUTE OVERVIEW ===
    # Try to fetch map
    map_img_data = fetch_map_image(stops)
    if map_img_data:
        try:
            map_img = Image(map_img_data, width=6.8*inch, height=3.6*inch)
            map_img.hAlign = 'CENTER'
            story.append(map_img)
            story.append(Spacer(1, 12))
        except Exception as e:
            print(f"Map image failed: {e}")

    # === NAVIGATION SECTION ===
    route_chunks = chunk_stops_for_google_maps(stops)

    story.append(Paragraph("Start Navigation", section_style))
    story.append(HRFlowable(width="100%", thickness=1, color=LIGHT_GRAY, spaceAfter=10))

    # Google Maps - supports full multi-stop route
    google_maps_url = generate_google_maps_url(stops)

    # Apple Maps and Waze - navigate to first stop (they don't support multi-stop via URL)
    apple_maps_url = generate_apple_maps_url(stops[0])
    waze_url = generate_waze_url(stops[0])

    if len(route_chunks) == 1:
        try:
            qr_img = Image(generate_qr_code(google_maps_url), width=1.2*inch, height=1.2*inch)

            # Navigation app links
            nav_links_style = ParagraphStyle("navlink", fontSize=10, textColor=DARK_GREEN, leading=16)

            nav_content = Table([
                [Paragraph("<b>Google Maps</b> (Full Route)",
                          ParagraphStyle("navheader", fontSize=11, textColor=CHARCOAL, fontName="Helvetica-Bold"))],
                [Paragraph(f'<a href="{google_maps_url}" color="#15803d"><u>Open full route with all {len(stops)} stops →</u></a>', nav_links_style)],
                [Spacer(1, 8)],
                [Paragraph("<b>Apple Maps / Waze</b> (Stop-by-Stop)",
                          ParagraphStyle("navheader2", fontSize=10, textColor=CHARCOAL, fontName="Helvetica-Bold"))],
                [Paragraph(
                    f'<a href="{apple_maps_url}" color="#15803d"><u>Apple Maps</u></a>  ·  '
                    f'<a href="{waze_url}" color="#15803d"><u>Waze</u></a>  '
                    '<font color="#6b7280" size="8">(navigate to 1st stop)</font>',
                    nav_links_style
                )],
            ], colWidths=[4.2*inch])

            qr_table = Table([
                [qr_img, nav_content]
            ], colWidths=[1.5*inch, 4.7*inch])
            qr_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (1, 0), (1, 0), 16),
            ]))
            story.append(qr_table)

            # Add note about Apple Maps and Waze limitations
            story.append(Spacer(1, 8))
            story.append(Paragraph(
                '<font color="#6b7280" size="8"><b>Note:</b> Apple Maps and Waze do not support multi-stop routes via links. '
                'Use Google Maps for the full route, or navigate to each stop individually with Apple Maps/Waze.</font>',
                small_style
            ))

        except Exception as e:
            print(f"QR generation failed: {e}")
            story.append(Paragraph(f'<a href="{google_maps_url}">Open in Google Maps</a>', body_style))
    else:
        story.append(Paragraph(
            f"Your route has {len(stops)} stops and is split into {len(route_chunks)} parts for Google Maps.",
            small_style
        ))
        story.append(Spacer(1, 8))

        qr_cells = []
        for i, chunk in enumerate(route_chunks):
            maps_url = generate_google_maps_url(chunk)
            start_idx = sum(len(route_chunks[j]) - 1 for j in range(i)) + 1
            end_idx = start_idx + len(chunk) - 1

            try:
                qr_img = Image(generate_qr_code(maps_url), width=1.1*inch, height=1.1*inch)
                cell_content = Table([
                    [qr_img],
                    [Paragraph(f'<b>Part {i+1}</b><br/><font size="8">Stops {start_idx}–{end_idx}</font>',
                               ParagraphStyle("qrlabel", fontSize=9, alignment=TA_CENTER, textColor=CHARCOAL, leading=11))]
                ])
                qr_cells.append(cell_content)
            except:
                qr_cells.append(Paragraph(f"Part {i+1}", small_style))

        col_width = 6.6 * inch / min(len(qr_cells), 4)
        qr_row = Table([qr_cells[:4]], colWidths=[col_width] * min(len(qr_cells), 4))
        qr_row.setStyle(TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER')]))
        story.append(qr_row)

        if len(qr_cells) > 4:
            story.append(Spacer(1, 8))
            qr_row2 = Table([qr_cells[4:]], colWidths=[col_width] * len(qr_cells[4:]))
            qr_row2.setStyle(TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER')]))
            story.append(qr_row2)

        # Add alternative nav apps for multi-part routes too
        story.append(Spacer(1, 10))
        story.append(Paragraph(
            f'<b>Alternative Apps:</b> '
            f'<a href="{apple_maps_url}" color="#15803d"><u>Apple Maps</u></a> · '
            f'<a href="{waze_url}" color="#15803d"><u>Waze</u></a> '
            '<font color="#6b7280" size="8">(navigate stop-by-stop)</font>',
            ParagraphStyle("altapps", fontSize=9, textColor=CHARCOAL)
        ))

    story.append(Spacer(1, 16))

    # === STOP LIST ===
    story.append(Paragraph("Route Details", section_style))
    story.append(HRFlowable(width="100%", thickness=1, color=LIGHT_GRAY, spaceAfter=12))

    for i, stop in enumerate(stops):
        stop_elements = []
        
        address = stop.get("address", "Unknown Address")
        if len(address) > 60:
            address = address[:57] + "..."
        
        # Stop number circle + address
        num_style = ParagraphStyle("num", fontSize=11, textColor=colors.white, alignment=TA_CENTER, fontName="Helvetica-Bold")

        # Create a colored circle with number - sized for double digits
        num_table = Table(
            [[Paragraph(str(i + 1), num_style)]],
            colWidths=[0.38*inch],
            rowHeights=[0.32*inch]
        )
        num_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), DARK_GREEN if i % 2 == 0 else RICH_RED),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('VALIGN', (0, 0), (0, 0), 'MIDDLE'),
            ('ROUNDEDCORNERS', [6, 6, 6, 6]),
            ('LEFTPADDING', (0, 0), (0, 0), 0),
            ('RIGHTPADDING', (0, 0), (0, 0), 0),
        ]))
        
        # Rating stars
        rating = stop.get("averageRating", 0)
        rating_str = ""
        if rating and rating > 0:
            full = int(round(rating))
            rating_str = f'<font color="#b45309">{"★" * full}{"☆" * (5-full)}</font> '
        
        addr_para = Paragraph(
            f'<b>{address}</b><br/>{rating_str}<font color="#6b7280" size="9">{stop.get("description", "")[:80] if stop.get("description") else ""}</font>',
            ParagraphStyle("addr", fontSize=10, textColor=CHARCOAL, leading=13)
        )
        
        row = Table([[num_table, addr_para]], colWidths=[0.55*inch, 6.05*inch])
        row.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (1, 0), (1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        stop_elements.append(row)
        
        # Distance to next stop
        if i < len(stops) - 1:
            dist = calculate_segment_distance(stop, stops[i + 1])
            drive_min = max(1, int((dist / 20) * 60))
            stop_elements.append(
                Paragraph(
                    f'<font color="#9ca3af">│</font>  <font color="#6b7280" size="8">{dist:.1f} mi · ~{drive_min} min drive</font>',
                    ParagraphStyle("dist", leftIndent=12, spaceBefore=2, spaceAfter=6)
                )
            )
        
        story.append(KeepTogether(stop_elements))

    # === FOOTER ===
    story.append(Spacer(1, 24))
    story.append(HRFlowable(width="100%", thickness=0.5, color=LIGHT_GRAY, spaceAfter=12))
    story.append(Paragraph(
        f"Generated {current_date} · DFW Christmas Lights Finder",
        footer_style
    ))
    story.append(Paragraph(
        "Drive safely and enjoy the lights!",
        ParagraphStyle("bye", fontSize=9, textColor=DARK_GREEN, alignment=TA_CENTER, fontName="Helvetica-Oblique", spaceBefore=4)
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def handler(event, context):
    """Handle POST /routes/generate-pdf request."""
    cors_headers = get_cors_headers(event)
    
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    try:
        body = json.loads(event.get("body", "{}"))
        stops = body.get("stops", [])

        if not stops:
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({"success": False, "message": "At least one stop is required"}),
            }

        if len(stops) > 15:
            return {
                "statusCode": 400,
                "headers": cors_headers,
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
            "headers": cors_headers,
            "body": json.dumps({
                "success": True,
                "data": {"downloadUrl": download_url, "expiresIn": PDF_EXPIRATION_SECONDS},
            }),
        }

    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"success": False, "message": "Invalid JSON body"}),
        }
    except ClientError as e:
        print(f"S3 error: {e}")
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"success": False, "message": "Failed to generate PDF"}),
        }
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"success": False, "message": "Internal server error"}),
        }
