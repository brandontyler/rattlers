#!/usr/bin/env python3
"""
Import locations from Google Maps export CSV.

This script:
1. Reads a CSV export from Google Takeout
2. Extracts coordinates from Google Maps URLs when available
3. Falls back to geocoding for addresses without URL coordinates
4. Creates locations directly for entries with valid coordinates
5. Creates suggestions (pending admin review) for entries needing manual review

Usage:
    cd scripts && uv run python import_locations.py "../data/Christmas Lights in DFW Google Map List.csv"
"""

import csv
import re
import sys
import time
import uuid
import argparse
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Dict, Optional, Tuple
from pathlib import Path

try:
    from geopy.geocoders import Nominatim
    import boto3
except ImportError:
    print("ERROR: Missing required packages. Run: uv sync")
    sys.exit(1)


# DFW center for geocoding bias
DFW_CENTER = (32.7767, -96.7970)

# Regex patterns for extracting coordinates from Google Maps URLs
COORD_PATTERNS = [
    # https://www.google.com/maps/search/33.0831691,-97.1232923
    r'maps/search/([-\d.]+),([-\d.]+)',
    # https://www.google.com/maps/place/.../@32.7767,-96.797,15z
    r'@([-\d.]+),([-\d.]+)',
    # https://www.google.com/maps?q=32.7767,-96.797
    r'[?&]q=([-\d.]+),([-\d.]+)',
]


def extract_coords_from_url(url: str) -> Optional[Tuple[float, float]]:
    """Extract lat/lng from Google Maps URL if present."""
    if not url:
        return None
    
    for pattern in COORD_PATTERNS:
        match = re.search(pattern, url)
        if match:
            try:
                lat = float(match.group(1))
                lng = float(match.group(2))
                # Validate coordinates are in reasonable range for DFW
                if 25 < lat < 40 and -105 < lng < -90:
                    return (lat, lng)
            except (ValueError, IndexError):
                continue
    return None


def extract_address_from_place_url(url: str) -> Optional[str]:
    """Extract address/place name from Google Maps place URL."""
    if not url:
        return None
    
    # https://www.google.com/maps/place/9719+Bernard+Rd/data=...
    match = re.search(r'maps/place/([^/]+)/data', url)
    if match:
        # URL decode the address
        import urllib.parse
        address = urllib.parse.unquote_plus(match.group(1))
        return address
    return None


def is_street_address(text: str) -> bool:
    """Check if text looks like a street address (has numbers and street words)."""
    if not text:
        return False
    # Has a number at the start
    has_number = bool(re.match(r'^\d+', text.strip()))
    # Has common street words
    street_words = ['st', 'street', 'ave', 'avenue', 'rd', 'road', 'dr', 'drive', 
                    'ln', 'lane', 'ct', 'court', 'blvd', 'way', 'pl', 'place', 'cir', 'circle']
    has_street_word = any(word in text.lower() for word in street_words)
    return has_number and has_street_word


def geocode_address(geocoder, address: str, rate_limit: float = 1.0) -> Optional[Tuple[float, float]]:
    """Geocode an address using Nominatim."""
    search = address
    if 'TX' not in address.upper() and 'TEXAS' not in address.upper():
        search = f"{address}, Dallas-Fort Worth, TX"
    
    try:
        time.sleep(rate_limit)
        location = geocoder.geocode(search)
        if location:
            return (location.latitude, location.longitude)
    except Exception as e:
        print(f"    Geocoding error: {e}")
    return None


def read_csv(file_path: str) -> List[Dict]:
    """Read Google Maps export CSV, handling the messy format."""
    locations = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find where the actual CSV data starts (after header comments)
    lines = content.split('\n')
    header_idx = None
    for i, line in enumerate(lines):
        if line.startswith('Title,'):
            header_idx = i
            break
    
    if header_idx is None:
        print("ERROR: Could not find CSV header row")
        return []
    
    # Parse from header onwards
    csv_content = '\n'.join(lines[header_idx:])
    reader = csv.DictReader(csv_content.split('\n'))
    
    for row in reader:
        title = (row.get('Title') or '').strip()
        note = (row.get('Note') or '').strip()
        url = (row.get('URL') or '').strip()
        
        # Skip empty rows
        if not title and not url:
            continue
        
        # Skip the empty row after header
        if not title and not note and not url:
            continue
            
        locations.append({
            'title': title,
            'note': note,
            'url': url,
        })
    
    print(f"✓ Read {len(locations)} entries from CSV")
    return locations


def process_locations(entries: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
    """
    Process entries and split into:
    - ready_for_import: Have valid coordinates from URL, can go directly to locations table
    - needs_review: Need admin review, go to suggestions table
    """
    ready = []
    needs_review = []
    
    print(f"\n📍 Processing {len(entries)} entries...")
    
    for i, entry in enumerate(entries, 1):
        title = entry['title']
        note = entry['note']
        url = entry['url']
        
        print(f"[{i}/{len(entries)}] {title[:50]}...", end=' ')
        
        # Step 1: Try to extract coordinates from URL
        coords = extract_coords_from_url(url)
        if coords:
            print(f"✓ coords from URL")
            
            # Use title as address
            address = title
            
            ready.append({
                'address': address,
                'description': note,
                'lat': coords[0],
                'lng': coords[1],
                'googleMapsUrl': url,
                'source': 'google-maps-import',
            })
            continue
        
        # Step 2: No coords in URL - extract address from Place URL if available
        place_address = extract_address_from_place_url(url)
        address = place_address or title
        
        print(f"→ needs review")
        needs_review.append({
            'address': address,
            'description': note,
            'googleMapsUrl': url,
            'source': 'google-maps-import',
        })
    
    print(f"\n✓ Ready for import: {len(ready)}")
    print(f"⚠ Needs admin review: {len(needs_review)}")
    
    return ready, needs_review


def import_to_locations(locations: List[Dict], table_name: str):
    """Import locations directly to locations table."""
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    table = dynamodb.Table(table_name)
    
    print(f"\n📤 Importing {len(locations)} locations to {table_name}...")
    
    now = datetime.now(timezone.utc).isoformat()
    imported = 0
    
    with table.batch_writer() as batch:
        for loc in locations:
            location_id = str(uuid.uuid4())
            
            item = {
                'PK': f'location#{location_id}',
                'SK': 'metadata',
                'id': location_id,
                'address': loc['address'],
                'lat': Decimal(str(loc['lat'])),
                'lng': Decimal(str(loc['lng'])),
                'description': loc.get('description', ''),
                'photos': [],
                'status': 'active',
                'feedbackCount': 0,
                'averageRating': Decimal('0'),
                'likeCount': 0,
                'reportCount': 0,
                'createdAt': now,
                'createdBy': 'import-script',
                'source': loc.get('source', 'google-maps-import'),
            }
            
            if loc.get('googleMapsUrl'):
                item['googleMapsUrl'] = loc['googleMapsUrl']
            
            batch.put_item(Item=item)
            imported += 1
            
            if imported % 25 == 0:
                print(f"  Imported {imported}/{len(locations)}...")
    
    print(f"✅ Imported {imported} locations")


def import_to_suggestions(entries: List[Dict], table_name: str):
    """Import entries needing review to suggestions table."""
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    table = dynamodb.Table(table_name)
    
    print(f"\n📤 Creating {len(entries)} suggestions for review in {table_name}...")
    
    now = datetime.now(timezone.utc).isoformat()
    imported = 0
    
    with table.batch_writer() as batch:
        for entry in entries:
            suggestion_id = str(uuid.uuid4())
            
            item = {
                'PK': f'SUGGESTION#{suggestion_id}',
                'SK': 'METADATA',
                'id': suggestion_id,
                'address': entry['address'],
                'description': entry.get('description', '') or 'Imported from Google Maps list - needs address/coordinates',
                'lat': Decimal('0'),  # Placeholder - admin needs to set
                'lng': Decimal('0'),  # Placeholder - admin needs to set
                'photos': [],
                'status': 'pending',
                'submittedBy': 'import-script',
                'submittedByEmail': 'import@system.local',
                'createdAt': now,
                'source': entry.get('source', 'google-maps-import'),
            }
            
            if entry.get('googleMapsUrl'):
                item['googleMapsUrl'] = entry['googleMapsUrl']
            
            batch.put_item(Item=item)
            imported += 1
    
    print(f"✅ Created {imported} suggestions for admin review")


def main():
    parser = argparse.ArgumentParser(description='Import Google Maps locations')
    parser.add_argument('input_csv', help='Path to Google Maps export CSV')
    parser.add_argument('--dry-run', action='store_true', help='Process but do not import')
    parser.add_argument('--locations-table', default='christmas-lights-locations-dev')
    parser.add_argument('--suggestions-table', default='christmas-lights-suggestions-dev')
    
    args = parser.parse_args()
    
    if not Path(args.input_csv).exists():
        print(f"ERROR: File not found: {args.input_csv}")
        sys.exit(1)
    
    print("🎄 DFW Christmas Lights - Location Importer v2")
    print("=" * 50)
    
    # Read CSV
    entries = read_csv(args.input_csv)
    if not entries:
        print("ERROR: No entries found")
        sys.exit(1)
    
    # Process and split
    ready, needs_review = process_locations(entries)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Summary:")
    print(f"   Total entries: {len(entries)}")
    print(f"   Ready for import (have coords): {len(ready)}")
    print(f"   Need admin review (no coords): {len(needs_review)}")
    
    if args.dry_run:
        print("\n🔍 DRY RUN - No changes made")
        return
    
    # Confirm
    confirm = input(f"\n⚠️  Import {len(ready)} locations and create {len(needs_review)} suggestions? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Aborted.")
        return
    
    # Import
    if ready:
        import_to_locations(ready, args.locations_table)
    
    if needs_review:
        import_to_suggestions(needs_review, args.suggestions_table)
    
    print("\n✅ Import complete!")
    if needs_review:
        print(f"   → Review {len(needs_review)} pending suggestions in Admin dashboard")


if __name__ == '__main__':
    main()
