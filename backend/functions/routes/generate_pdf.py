"""Lambda function to generate a stunning, festive PDF route guide using ReportLab best practices."""

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
    BaseDocTemplate,
    PageTemplate,
    Frame,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfgen import canvas

s3_client = boto3.client("s3")

PHOTOS_BUCKET = os.environ.get("PHOTOS_BUCKET_NAME", "christmas-lights-photos-dev")
PDF_EXPIRATION_SECONDS = 3600


def get_allowed_origins() -> list:
    """Get list of allowed origins from environment."""
    origins_str = os.environ.get("ALLOWED_ORIGINS", "")
    if origins_str:
        return [o.strip() for o in origins_str.split(",") if o.strip()]
    single = os.environ.get("ALLOWED_ORIGIN", "")
    return [single] if single else ["*"]


def get_cors_headers(event: dict) -> dict:
    """Get CORS headers based on request origin."""
    origin = event.get("headers", {}).get("origin") or event.get("headers", {}).get("Origin", "")
    allowed = get_allowed_origins()
    cors_origin = origin if origin in allowed else allowed[0]
    return {
        "Access-Control-Allow-Origin": cors_origin,
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
    }


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
LIGHT_GREEN = colors.HexColor("#dcfce7")
LIGHT_RED = colors.HexColor("#fee2e2")


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
    center_lat = (min(lats) + max(lats)) / 2
    center_lng = (min(lngs) + max(lngs)) / 2
    
    max_diff = max(max(lats) - min(lats), max(lngs) - min(lngs))
    zoom = 14 if max_diff < 0.05 else 13 if max_diff < 0.1 else 12 if max_diff < 0.2 else 11 if max_diff < 0.5 else 10
    
    try:
        markers_param = "|".join([f"{s['lng']},{s['lat']},ol-marker-green" for s in stops])
        map_url = (
            f"https://staticmap.openstreetmap.de/staticmap.php"
            f"?center={center_lat},{center_lng}&zoom={zoom}&size=600x350&maptype=mapnik&markers={markers_param}"
        )
        with urlopen(map_url, timeout=15) as response:
            img_data = BytesIO(response.read())
            img_data.seek(0)
            return img_data
    except Exception as e:
        print(f"Map generation failed: {e}")
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
    """Split stops into chunks that fit Google Maps URL limits."""
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
    """Generate a QR code image for the given URL."""
    import qrcode
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#14532d", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer


class FestiveDocTemplate(BaseDocTemplate):
    """Custom document template with decorative headers, footers, and page numbers."""
    
    def __init__(self, filename, **kwargs):
        self.num_stops = kwargs.pop('num_stops', 0)
        self.total_miles = kwargs.pop('total_miles', 0)
        super().__init__(filename, **kwargs)
        
        # Define frame with margins for decorative borders
        frame = Frame(
            0.75 * inch, 0.9 * inch,  # x, y from bottom-left
            7 * inch, 9.2 * inch,  # width, height
            id='main'
        )
        template = PageTemplate(id='festive', frames=[frame], onPage=self._draw_page_decorations)
        self.addPageTemplates([template])
    
    def _draw_page_decorations(self, canvas, doc):
        """Draw decorative elements on each page."""
        canvas.saveState()
        width, height = letter
        
        # Decorative corner ornaments
        self._draw_corner_ornament(canvas, 30, height - 30, "tl")
        self._draw_corner_ornament(canvas, width - 30, height - 30, "tr")
        self._draw_corner_ornament(canvas, 30, 30, "bl")
        self._draw_corner_ornament(canvas, width - 30, 30, "br")
        
        # Subtle border lines
        canvas.setStrokeColor(GOLD)
        canvas.setLineWidth(0.5)
        canvas.line(40, height - 45, width - 40, height - 45)  # Top
        canvas.line(40, 45, width - 40, 45)  # Bottom
        
        # Page number footer
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(SOFT_GRAY)
        page_num = canvas.getPageNumber()
        canvas.drawCentredString(width / 2, 28, f"— {page_num} —")
        
        # Footer branding
        canvas.setFont("Helvetica-Oblique", 8)
        canvas.drawCentredString(width / 2, 18, "DFW Christmas Lights Finder")
        
        canvas.restoreState()
    
    def _draw_corner_ornament(self, canvas, x, y, corner):
        """Draw a small festive ornament at corners."""
        canvas.saveState()
        size = 12
        
        # Draw a small star/snowflake pattern
        canvas.setStrokeColor(GOLD)
        canvas.setFillColor(GOLD)
        canvas.setLineWidth(1)
        
        if corner == "tl":
            canvas.line(x, y, x + size, y)
            canvas.line(x, y, x, y - size)
            canvas.circle(x + 3, y - 3, 2, fill=1)
        elif corner == "tr":
            canvas.line(x, y, x - size, y)
            canvas.line(x, y, x, y - size)
            canvas.circle(x - 3, y - 3, 2, fill=1)
        elif corner == "bl":
            canvas.line(x, y, x + size, y)
            canvas.line(x, y, x, y + size)
            canvas.circle(x + 3, y + 3, 2, fill=1)
        elif corner == "br":
            canvas.line(x, y, x - size, y)
            canvas.line(x, y, x, y + size)
            canvas.circle(x - 3, y + 3, 2, fill=1)
        
        canvas.restoreState()


def create_pdf(stops: list) -> bytes:
    """Generate a stunning, festive PDF route guide with ReportLab best practices."""
    buffer = BytesIO()
    stats = calculate_route_stats(stops)
    
    # Use custom template with page decorations
    doc = FestiveDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.9 * inch,
        num_stops=len(stops),
        total_miles=stats["total_distance"],
    )

    # Styles
    title_style = ParagraphStyle(
        "Title", fontSize=28, textColor=DEEP_RED, alignment=TA_CENTER,
        fontName="Helvetica-Bold", spaceAfter=2, leading=34,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle", fontSize=12, textColor=FOREST_GREEN, alignment=TA_CENTER,
        fontName="Helvetica-Oblique", spaceAfter=8,
    )
    date_style = ParagraphStyle(
        "Date", fontSize=10, textColor=SOFT_GRAY, alignment=TA_CENTER, spaceAfter=12,
    )
    section_header_style = ParagraphStyle(
        "SectionHeader", fontSize=13, textColor=PINE_GREEN, fontName="Helvetica-Bold",
        spaceBefore=14, spaceAfter=6,
    )
    tip_style = ParagraphStyle(
        "Tip", fontSize=10, textColor=SOFT_GRAY, leftIndent=15, spaceAfter=4, leading=13,
    )

    current_date = datetime.now().strftime("%A, %B %d, %Y")
    story = []

    # ===== DECORATIVE HEADER =====
    story.append(Paragraph(
        '<font color="#ca8a04">❄</font>  '
        '<font color="#dc2626">✦</font>  '
        '<font color="#166534">❄</font>  '
        '<font color="#ca8a04">✦</font>  '
        '<font color="#dc2626">❄</font>  '
        '<font color="#166534">✦</font>  '
        '<font color="#ca8a04">❄</font>',
        ParagraphStyle("Decor", fontSize=14, alignment=TA_CENTER, spaceAfter=10)
    ))
    
    story.append(Paragraph("Christmas Lights Adventure", title_style))
    story.append(Paragraph("Your Personalized Route Guide", subtitle_style))
    story.append(Paragraph(current_date, date_style))

    # ===== STATS BOX WITH GRADIENT EFFECT =====
    stats_data = [[
        Paragraph(f'<font color="#166534" size="22"><b>{len(stops)}</b></font><br/><font size="9" color="#6b7280">Stops</font>', 
                  ParagraphStyle("s", alignment=TA_CENTER, leading=16)),
        Paragraph(f'<font color="#991b1b" size="22"><b>{stats["total_distance"]}</b></font><br/><font size="9" color="#6b7280">Miles</font>', 
                  ParagraphStyle("s", alignment=TA_CENTER, leading=16)),
        Paragraph(f'<font color="#ca8a04" size="22"><b>~{format_duration(stats["total_time"])}</b></font><br/><font size="9" color="#6b7280">Est. Time</font>', 
                  ParagraphStyle("s", alignment=TA_CENTER, leading=16)),
    ]]
    
    stats_table = Table(stats_data, colWidths=[2.1*inch, 2.1*inch, 2.1*inch])
    stats_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (0, 0), LIGHT_GREEN),
        ('BACKGROUND', (1, 0), (1, 0), LIGHT_RED),
        ('BACKGROUND', (2, 0), (2, 0), CREAM),
        ('BOX', (0, 0), (-1, -1), 1.5, GOLD),
        ('LINEAFTER', (0, 0), (1, 0), 0.5, GOLD),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(stats_table)
    story.append(Spacer(1, 10))

    # ===== MAP IMAGE =====
    map_image = get_static_map_image(stops)
    if map_image:
        try:
            img = Image(map_image, width=6.5*inch, height=3.3*inch)
            img.hAlign = 'CENTER'
            map_table = Table([[img]], colWidths=[6.7*inch])
            map_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('BOX', (0, 0), (-1, -1), 2, FOREST_GREEN),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('LEFTPADDING', (0, 0), (-1, -1), 3),
                ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ]))
            story.append(map_table)
            story.append(Spacer(1, 8))
        except Exception as e:
            print(f"Failed to add map image: {e}")
    
    # ===== QR CODES =====
    route_chunks = chunk_stops_for_google_maps(stops)
    story.append(Paragraph("📱 Scan for Turn-by-Turn Directions", section_header_style))
    
    if len(route_chunks) == 1:
        maps_url = generate_google_maps_url(stops)
        try:
            qr_img = Image(generate_qr_code(maps_url), width=1.4*inch, height=1.4*inch)
            qr_table = Table([
                [qr_img, Paragraph(
                    f'<font color="#166534"><b>Scan with your phone camera</b></font><br/><br/>'
                    f'<font color="#6b7280" size="9">Opens Google Maps with complete<br/>'
                    f'turn-by-turn navigation for all {len(stops)} stops</font>',
                    ParagraphStyle("qr", alignment=TA_LEFT, leading=13)
                )]
            ], colWidths=[1.7*inch, 4.5*inch])
            qr_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (1, 0), (1, 0), 12),
                ('BACKGROUND', (0, 0), (-1, -1), SNOW_WHITE),
                ('BOX', (0, 0), (-1, -1), 0.5, SOFT_GRAY),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            story.append(qr_table)
        except Exception as e:
            print(f"Failed to generate QR code: {e}")
    else:
        story.append(Paragraph(
            f'<font color="#6b7280" size="9">Route split into {len(route_chunks)} parts for Google Maps. Scan in order.</font>',
            ParagraphStyle("note", alignment=TA_CENTER, spaceAfter=6)
        ))
        qr_cells = []
        for i, chunk in enumerate(route_chunks):
            maps_url = generate_google_maps_url(chunk)
            start_stop = sum(len(route_chunks[j]) - 1 for j in range(i)) + 1
            end_stop = start_stop + len(chunk) - 1
            try:
                qr_img = Image(generate_qr_code(maps_url), width=1.1*inch, height=1.1*inch)
                qr_cell = Table([
                    [qr_img],
                    [Paragraph(f'<font color="#166534" size="9"><b>Part {i+1}</b></font><br/>'
                               f'<font color="#6b7280" size="8">Stops {start_stop}-{end_stop}</font>',
                               ParagraphStyle("qrlabel", alignment=TA_CENTER, leading=11))]
                ])
                qr_cells.append(qr_cell)
            except:
                qr_cells.append(Paragraph(f'Part {i+1}', ParagraphStyle("err", alignment=TA_CENTER)))
        
        col_width = 6.3 * inch / min(len(qr_cells), 4)
        for row_start in range(0, len(qr_cells), 4):
            row = qr_cells[row_start:row_start + 4]
            qr_row_table = Table([row], colWidths=[col_width] * len(row))
            qr_row_table.setStyle(TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
            story.append(qr_row_table)
    
    story.append(Spacer(1, 10))
    
    # ===== ROUTE STOPS WITH ALTERNATING COLORS =====
    story.append(Paragraph("🗺️ Your Route", section_header_style))
    
    for i, stop in enumerate(stops):
        stop_elements = []
        address = stop.get("address", "Unknown Address")
        if len(address) > 55:
            address = address[:52] + "..."
        
        # Rating display
        rating = stop.get("averageRating", 0)
        rating_text = ""
        if rating and rating > 0:
            full_stars = int(rating)
            rating_text = f'  <font color="#ca8a04">{"★" * full_stars}{"☆" * (5 - full_stars)}</font>'
        
        # Alternating row background
        row_bg = LIGHT_GREEN if i % 2 == 0 else SNOW_WHITE
        
        stop_content = [[
            Paragraph(f'<font color="#dc2626" size="18"><b>{i + 1}</b></font>', 
                      ParagraphStyle("num", alignment=TA_CENTER)),
            Paragraph(f'<font size="11"><b>{address}</b></font>{rating_text}',
                      ParagraphStyle("addr", leading=14)),
        ]]
        
        stop_table = Table(stop_content, colWidths=[0.45*inch, 5.85*inch])
        stop_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (0, 0), (-1, -1), row_bg),
            ('LEFTPADDING', (0, 0), (0, 0), 6),
            ('RIGHTPADDING', (0, 0), (0, 0), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        stop_elements.append(stop_table)
        
        # Description
        description = stop.get("description", "")
        if description:
            if len(description) > 120:
                description = description[:117] + "..."
            stop_elements.append(Paragraph(
                f'<font color="#6b7280" size="9">{description}</font>',
                ParagraphStyle("desc", leftIndent=32, spaceAfter=2, leading=12)
            ))
        
        # Distance to next
        if i < len(stops) - 1:
            dist = calculate_segment_distance(stop, stops[i + 1])
            drive_time = int((dist / 25) * 60) + 1
            stop_elements.append(Paragraph(
                f'<font color="#166534" size="9">↓ {dist:.1f} mi · ~{drive_time} min</font>',
                ParagraphStyle("dist", alignment=TA_CENTER, spaceBefore=4, spaceAfter=4)
            ))
        
        story.append(KeepTogether(stop_elements))

    # ===== TIPS =====
    story.append(Spacer(1, 10))
    story.append(Paragraph("💡 Tips for Your Adventure", section_header_style))
    
    tips = [
        ("🚗", "Drive slowly through neighborhoods — enjoy the view!"),
        ("☕", "Bring hot cocoa and holiday music for the family"),
        ("📸", "Capture memories — but stay safe, don't block traffic"),
        ("🎵", "Tune to 100.3 FM for synchronized music displays"),
        ("⏰", "Best viewing after 6 PM when fully dark"),
    ]
    for emoji, tip in tips:
        story.append(Paragraph(f'{emoji}  {tip}', tip_style))

    # ===== FOOTER =====
    story.append(Spacer(1, 14))
    story.append(Paragraph(
        '<font color="#ca8a04">❄</font>  '
        '<font color="#dc2626">✦</font>  '
        '<font color="#166534">❄</font>  '
        '<font color="#ca8a04">✦</font>  '
        '<font color="#dc2626">❄</font>',
        ParagraphStyle("FooterDecor", fontSize=12, alignment=TA_CENTER, spaceAfter=6)
    ))
    story.append(Paragraph(
        "Have a magical Christmas lights adventure!",
        ParagraphStyle("Magic", fontSize=11, textColor=DEEP_RED, alignment=TA_CENTER, 
                       fontName="Helvetica-Oblique")
    ))

    # Build with compression enabled
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
