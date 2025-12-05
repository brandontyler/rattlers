"""Lambda function to generate a beautiful, festive PDF route guide using WeasyPrint."""

import json
import os
import uuid
import math
import base64
from datetime import datetime
from io import BytesIO
from urllib.request import urlopen
from urllib.parse import quote

import boto3
from botocore.exceptions import ClientError
from weasyprint import HTML, CSS

s3_client = boto3.client("s3")

PHOTOS_BUCKET = os.environ.get("PHOTOS_BUCKET_NAME", "christmas-lights-photos-dev")
PDF_EXPIRATION_SECONDS = 3600


def get_allowed_origins() -> list:
    """Get list of allowed origins from environment."""
    origins_str = os.environ.get("ALLOWED_ORIGINS", "")
    if origins_str:
        return [o.strip() for o in origins_str.split(",") if o.strip()]
    # Fallback to single origin for backwards compatibility
    single = os.environ.get("ALLOWED_ORIGIN", "")
    return [single] if single else ["*"]


def get_cors_headers(event: dict) -> dict:
    """Get CORS headers based on request origin."""
    origin = event.get("headers", {}).get("origin") or event.get("headers", {}).get("Origin", "")
    allowed = get_allowed_origins()

    # Return matching origin, or first allowed origin as default
    cors_origin = origin if origin in allowed else allowed[0]

    return {
        "Access-Control-Allow-Origin": cors_origin,
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


def get_static_map_image_base64(stops: list) -> str:
    """Generate a static map image and return as base64."""
    if not stops:
        return ""

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

    width, height = 800, 500

    try:
        # Use staticmap.openstreetmap.de
        markers_param = "|".join([
            f"{s['lng']},{s['lat']},ol-marker-green"
            for s in stops
        ])

        map_url = (
            f"https://staticmap.openstreetmap.de/staticmap.php"
            f"?center={center_lat},{center_lng}"
            f"&zoom={zoom}"
            f"&size={width}x{height}"
            f"&maptype=mapnik"
            f"&markers={markers_param}"
        )

        with urlopen(map_url, timeout=15) as response:
            img_data = response.read()
            return base64.b64encode(img_data).decode('utf-8')
    except Exception as e:
        print(f"Map generation failed: {e}")
        return ""


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


def generate_qr_code_base64(url: str) -> str:
    """Generate a QR code image and return as base64."""
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
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


def get_snowflake_svg() -> str:
    """Return an SVG snowflake pattern as data URI."""
    svg = '''<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <g opacity="0.15" fill="#166534">
    <path d="M50 10 L50 90 M10 50 L90 50 M20 20 L80 80 M80 20 L20 80" stroke="#166534" stroke-width="2"/>
    <circle cx="50" cy="10" r="3"/>
    <circle cx="50" cy="90" r="3"/>
    <circle cx="10" cy="50" r="3"/>
    <circle cx="90" cy="50" r="3"/>
    <circle cx="20" cy="20" r="3"/>
    <circle cx="80" cy="80" r="3"/>
    <circle cx="80" cy="20" r="3"/>
    <circle cx="20" cy="80" r="3"/>
  </g>
</svg>'''
    return f"data:image/svg+xml;base64,{base64.b64encode(svg.encode()).decode()}"


def create_pdf_html(stops: list) -> str:
    """Generate beautiful HTML for the PDF."""
    stats = calculate_route_stats(stops)
    current_date = datetime.now().strftime("%A, %B %d, %Y")
    map_base64 = get_static_map_image_base64(stops)
    route_chunks = chunk_stops_for_google_maps(stops)

    # Generate QR codes
    qr_codes_html = ""
    if len(route_chunks) == 1:
        maps_url = generate_google_maps_url(stops)
        qr_base64 = generate_qr_code_base64(maps_url)
        qr_codes_html = f'''
        <div class="qr-section single">
            <div class="qr-container">
                <img src="data:image/png;base64,{qr_base64}" alt="QR Code" class="qr-code">
                <div class="qr-description">
                    <h3>Scan with your phone</h3>
                    <p>Opens Google Maps with turn-by-turn directions for all {len(stops)} stops</p>
                </div>
            </div>
        </div>
        '''
    else:
        qr_codes_html = '<div class="qr-section multiple">'
        qr_codes_html += f'<p class="qr-note">Your route has {len(stops)} stops. Scan each QR code in order for turn-by-turn directions.</p>'
        qr_codes_html += '<div class="qr-grid">'
        for i, chunk in enumerate(route_chunks):
            maps_url = generate_google_maps_url(chunk)
            qr_base64 = generate_qr_code_base64(maps_url)
            start_stop = sum(len(route_chunks[j]) - 1 for j in range(i)) + 1
            end_stop = start_stop + len(chunk) - 1
            qr_codes_html += f'''
            <div class="qr-item">
                <img src="data:image/png;base64,{qr_base64}" alt="QR Code Part {i+1}" class="qr-code-small">
                <p class="qr-label"><strong>Part {i+1}</strong><br>Stops {start_stop}-{end_stop}</p>
            </div>
            '''
        qr_codes_html += '</div></div>'

    # Generate stops HTML
    stops_html = ""
    for i, stop in enumerate(stops):
        address = stop.get("address", "Unknown Address")
        if len(address) > 60:
            address = address[:57] + "..."

        rating = stop.get("averageRating", 0)
        stars_html = ""
        if rating and rating > 0:
            full_stars = int(rating)
            empty_stars = 5 - full_stars
            stars_html = f'''
            <div class="rating">
                <span class="stars">{"★" * full_stars}{"☆" * empty_stars}</span>
                <span class="rating-number">({rating:.1f})</span>
            </div>
            '''

        description = stop.get("description", "")
        if description:
            if len(description) > 150:
                description = description[:147] + "..."
            description_html = f'<p class="stop-description">{description}</p>'
        else:
            description_html = ""

        distance_html = ""
        if i < len(stops) - 1:
            dist = calculate_segment_distance(stop, stops[i + 1])
            drive_time = int((dist / 25) * 60) + 1
            distance_html = f'''
            <div class="distance-indicator">
                <span class="arrow">↓</span>
                <span class="distance-text">{dist:.1f} mi · ~{drive_time} min drive</span>
            </div>
            '''

        stops_html += f'''
        <div class="stop-card">
            <div class="stop-header">
                <div class="stop-number">{i + 1}</div>
                <div class="stop-info">
                    <h3 class="stop-address">{address}</h3>
                    {stars_html}
                </div>
            </div>
            {description_html}
        </div>
        {distance_html}
        '''

    html = f'''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Lora:ital,wght@0,400;0,600;1,400&family=Outfit:wght@300;400;600;700&display=swap');

            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}

            @page {{
                size: letter;
                margin: 0.75in 0.6in;
            }}

            body {{
                font-family: 'Outfit', 'Lato', sans-serif;
                background: linear-gradient(135deg, #fef3c7 0%, #fafafa 50%, #e0f2fe 100%);
                background-image:
                    url("{get_snowflake_svg()}"),
                    linear-gradient(135deg, #fef3c7 0%, #fafafa 50%, #e0f2fe 100%);
                background-size: 100px 100px, 100% 100%;
                background-repeat: repeat, no-repeat;
                color: #1f2937;
                line-height: 1.6;
            }}

            /* Header Section */
            .header {{
                text-align: center;
                padding: 20px 0 30px 0;
                position: relative;
            }}

            .ornament-border {{
                font-size: 24px;
                letter-spacing: 15px;
                margin-bottom: 15px;
                opacity: 0.8;
            }}

            .ornament-border .red {{ color: #dc2626; }}
            .ornament-border .green {{ color: #166534; }}
            .ornament-border .gold {{ color: #ca8a04; }}

            .title {{
                font-family: 'Playfair Display', serif;
                font-size: 56px;
                font-weight: 900;
                background: linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #ca8a04 100%);
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
                margin: 15px 0;
                line-height: 1.2;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
            }}

            .subtitle {{
                font-family: 'Lora', serif;
                font-size: 20px;
                font-style: italic;
                color: #166534;
                margin: 10px 0;
                font-weight: 400;
            }}

            .date {{
                font-size: 14px;
                color: #6b7280;
                margin-top: 10px;
            }}

            /* Stats Section */
            .stats {{
                display: flex;
                justify-content: space-around;
                background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%);
                border: 3px solid #ca8a04;
                border-radius: 15px;
                padding: 25px 15px;
                margin: 25px 0;
                box-shadow: 0 4px 12px rgba(202, 138, 4, 0.3);
            }}

            .stat-item {{
                text-align: center;
                flex: 1;
            }}

            .stat-value {{
                font-size: 32px;
                font-weight: 700;
                display: block;
                margin-bottom: 5px;
            }}

            .stat-value.green {{ color: #166534; }}
            .stat-value.red {{ color: #991b1b; }}
            .stat-value.gold {{ color: #ca8a04; }}

            .stat-label {{
                font-size: 14px;
                color: #4b5563;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-weight: 600;
            }}

            /* Map Section */
            .map-container {{
                margin: 30px 0;
                text-align: center;
                border: 4px solid #166534;
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 6px 20px rgba(22, 101, 52, 0.3);
                background: white;
            }}

            .map-container img {{
                width: 100%;
                height: auto;
                display: block;
            }}

            /* Section Headers */
            .section-header {{
                font-family: 'Playfair Display', serif;
                font-size: 24px;
                font-weight: 700;
                color: #14532d;
                margin: 30px 0 15px 0;
                padding-bottom: 10px;
                border-bottom: 3px solid #166534;
                display: flex;
                align-items: center;
            }}

            .section-header::before {{
                content: "🎄";
                margin-right: 10px;
                font-size: 28px;
            }}

            /* QR Code Section */
            .qr-section {{
                background: white;
                border: 2px solid #166534;
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }}

            .qr-section.single .qr-container {{
                display: flex;
                align-items: center;
                gap: 20px;
            }}

            .qr-code {{
                width: 150px;
                height: 150px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
            }}

            .qr-description h3 {{
                font-size: 18px;
                color: #166534;
                margin-bottom: 8px;
                font-weight: 600;
            }}

            .qr-description p {{
                font-size: 14px;
                color: #6b7280;
                line-height: 1.5;
            }}

            .qr-note {{
                text-align: center;
                font-size: 13px;
                color: #6b7280;
                margin-bottom: 15px;
            }}

            .qr-grid {{
                display: flex;
                justify-content: space-around;
                gap: 15px;
                flex-wrap: wrap;
            }}

            .qr-item {{
                text-align: center;
                flex: 0 1 auto;
            }}

            .qr-code-small {{
                width: 100px;
                height: 100px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                margin-bottom: 8px;
            }}

            .qr-label {{
                font-size: 12px;
                color: #6b7280;
            }}

            .qr-label strong {{
                color: #166534;
                font-size: 13px;
            }}

            /* Stop Cards */
            .stop-card {{
                background: white;
                border-left: 6px solid #dc2626;
                border-radius: 10px;
                padding: 20px;
                margin: 15px 0;
                box-shadow: 0 3px 10px rgba(0,0,0,0.1);
                page-break-inside: avoid;
            }}

            .stop-header {{
                display: flex;
                gap: 15px;
                align-items: flex-start;
            }}

            .stop-number {{
                font-size: 36px;
                font-weight: 700;
                color: #dc2626;
                min-width: 50px;
                text-align: center;
                line-height: 1;
            }}

            .stop-info {{
                flex: 1;
            }}

            .stop-address {{
                font-size: 16px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 5px;
            }}

            .rating {{
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: 5px;
            }}

            .stars {{
                color: #ca8a04;
                font-size: 16px;
                letter-spacing: 2px;
            }}

            .rating-number {{
                font-size: 13px;
                color: #6b7280;
            }}

            .stop-description {{
                margin-top: 12px;
                font-size: 14px;
                color: #6b7280;
                line-height: 1.5;
                padding-left: 65px;
            }}

            .distance-indicator {{
                text-align: center;
                margin: 15px 0;
                color: #166534;
                font-size: 14px;
                font-weight: 600;
            }}

            .arrow {{
                display: block;
                font-size: 24px;
                margin-bottom: 5px;
            }}

            .distance-text {{
                font-style: italic;
            }}

            /* Tips Section */
            .tips-section {{
                background: linear-gradient(135deg, #fef3c7 0%, #ffffff 100%);
                border: 2px solid #ca8a04;
                border-radius: 12px;
                padding: 20px;
                margin: 25px 0;
            }}

            .tip-item {{
                display: flex;
                align-items: flex-start;
                gap: 12px;
                margin: 10px 0;
                font-size: 14px;
                color: #4b5563;
            }}

            .tip-emoji {{
                font-size: 20px;
                min-width: 25px;
            }}

            /* Footer */
            .footer {{
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 2px solid #e5e7eb;
            }}

            .footer-message {{
                font-family: 'Lora', serif;
                font-size: 18px;
                font-style: italic;
                color: #991b1b;
                margin: 15px 0;
            }}

            .footer-credit {{
                font-size: 12px;
                color: #6b7280;
            }}
        </style>
    </head>
    <body>
        <!-- Header -->
        <div class="header">
            <div class="ornament-border">
                <span class="green">✦</span><span class="red">✦</span><span class="gold">✦</span><span class="green">✦</span><span class="red">✦</span><span class="gold">✦</span><span class="green">✦</span>
            </div>
            <h1 class="title">Christmas Lights Adventure</h1>
            <p class="subtitle">~ Your Family Route Guide ~</p>
            <p class="date">{current_date}</p>
        </div>

        <!-- Stats -->
        <div class="stats">
            <div class="stat-item">
                <span class="stat-value green">{len(stops)}</span>
                <span class="stat-label">Stops</span>
            </div>
            <div class="stat-item">
                <span class="stat-value red">{stats["total_distance"]}</span>
                <span class="stat-label">Miles</span>
            </div>
            <div class="stat-item">
                <span class="stat-value gold">~{format_duration(stats["total_time"])}</span>
                <span class="stat-label">Total Time</span>
            </div>
        </div>

        <!-- Map -->
        {f'<div class="map-container"><img src="data:image/png;base64,{map_base64}" alt="Route Map"></div>' if map_base64 else ''}

        <!-- QR Codes -->
        <h2 class="section-header">Scan for Directions</h2>
        {qr_codes_html}

        <!-- Route Stops -->
        <h2 class="section-header">Your Route</h2>
        {stops_html}

        <!-- Tips -->
        <h2 class="section-header">Tips for Your Adventure</h2>
        <div class="tips-section">
            <div class="tip-item">
                <span class="tip-emoji">🚗</span>
                <span>Drive slowly through neighborhoods — enjoy the view!</span>
            </div>
            <div class="tip-item">
                <span class="tip-emoji">☕</span>
                <span>Bring hot cocoa and holiday music for the family</span>
            </div>
            <div class="tip-item">
                <span class="tip-emoji">📸</span>
                <span>Capture memories — but stay safe, don't block traffic</span>
            </div>
            <div class="tip-item">
                <span class="tip-emoji">🎵</span>
                <span>Tune to 100.3 FM for houses with synchronized music</span>
            </div>
            <div class="tip-item">
                <span class="tip-emoji">⏰</span>
                <span>Best viewing is after 6 PM when it's fully dark</span>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="ornament-border">
                <span class="green">✦</span><span class="red">✦</span><span class="gold">✦</span><span class="green">✦</span><span class="red">✦</span>
            </div>
            <p class="footer-message">Have a magical Christmas lights adventure!</p>
            <p class="footer-credit">Created with DFW Christmas Lights Finder</p>
        </div>
    </body>
    </html>
    '''

    return html


def create_pdf(stops: list) -> bytes:
    """Generate a beautiful, festive PDF route guide using WeasyPrint."""
    html_content = create_pdf_html(stops)
    pdf_bytes = HTML(string=html_content).write_pdf()
    return pdf_bytes


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
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"success": False, "message": "Internal server error"}),
        }
