#!/usr/bin/env python3
"""
Import locations from Google Maps export CSV.

This script:
1. Reads a CSV export from Google Takeout
2. Extracts coordinates from Google Maps URLs when available
3. Uses Google Places API to resolve Place IDs to coordinates
4. Falls back to Google Geocoding API for street addresses
5. Creates suggestions for entries that can't be resolved

Usage:
    cd scripts && uv run python import_locations.py "../data/Christmas Lights in DFW Google Map List.csv"

Requires:
    - .env file with GOOGLE_API_KEY=your_key
"""

import csv
import os
import re
import sys
import time
import uuid
import argparse
import requests
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Dict, Optional, Tuple
from pathlib import Path

try:
    import boto3
    from dotenv import load_dotenv
except ImportError:
    print("ERROR: Missing required packages. Run: uv add python-dotenv requests boto3")
    sys.exit(1)

# Load environment variables
load_dotenv()
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

# DFW center for geocoding bias
DFW_CENTER = (32.7767, -96.7970)

# Regex patterns for extracting data from Google Maps URLs
COORD_PATTERN = r'maps/search/([-\d.]+),([-\d.]+)'
PLACE_ID_PATTERN = r'!1s(0x[0-9a-f]+:0x[0-9a-f]+)'
PLACE_NAME_PATTERN = r'maps/place/([^/]+)/data'


def extract_coords_from_url(url: str) -> Optional[Tuple[float, float]]:
    """Extract lat/lng from Google Maps URL if present."""
    if not url:
        return None
    
    match = re.search(COORD_PATTERN, url)
    if match:
        try:
            lat = float(match.group(1))
            lng = float(match.group(2))
            if 25 < lat < 40 and -105 < lng < -90:
                return (lat, lng)
        except (ValueError, IndexError):
            pass
    return None


def extract_place_id_from_url(url: str) -> Optional[str]:
    """Extract Google Place ID from URL."""
    if not url:
        return None
    match = re.search(PLACE_ID_PATTERN, url)
    return match.group(1) if match else None


def extract_place_name_from_url(url: str) -> Optional[str]:
    """Extract place name from URL path."""
    if not url:
        return None
    match = re.search(PLACE_NAME_PATTERN, url)
    if match:
        import urllib.parse
        return urllib.parse.unquote_plus(match.group(1))
    return None


def is_street_address(text: str) -> bool:
    """Check if text looks like a street address."""
    if not text:
        return False
    has_number = bool(re.match(r'^\d+', text.strip()))
    street_words = ['st', 'street', 'ave', 'avenue', 'rd', 'road', 'dr', 'drive', 
                    'ln', 'lane', 'ct', 'court', 'blvd', 'way', 'pl', 'place', 'cir', 
                    'circle', 'trail', 'pkwy', 'hwy', 'fm']
    has_street_word = any(word in text.lower().split() for word in street_words)
    return has_number and has_street_word


def geocode_place_id(place_id: str) -> Optional[Tuple[float, float]]:
    """Use Google Places API to get coordinates from Place ID."""
    if not GOOGLE_API_KEY:
        return None
    
    # Google Place IDs from URLs are in format "0x...:0x..."
    # We need to convert to the API format
    url = f"https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        'place_id': place_id,
        'fields': 'geometry',
        'key': GOOGLE_API_KEY
    }
    
    try:
        # First try with the raw place_id
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data.get('status') == 'OK':
            loc = data['result']['geometry']['location']
            return (loc['lat'], loc['lng'])
    except Exception as e:
        pass
    
    return None


def geocode_address(address: str) -> Optional[Tuple[float, float]]:
    """Use Google Geocoding API to get coordinates from address."""
    if not GOOGLE_API_KEY:
        return None
    
    search = address
    if 'TX' not in address.upper() and 'TEXAS' not in address.upper():
        search = f"{address}, Dallas-Fort Worth, TX"
    
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        'address': search,
        'key': GOOGLE_API_KEY,
        'bounds': '32.0,-97.5|33.5,-96.0'  # DFW bounding box
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data.get('status') == 'OK' and data.get('results'):
            loc = data['results'][0]['geometry']['location']
            return (loc['lat'], loc['lng'])
    except Exception as e:
        print(f"    Geocoding error: {e}")
    
    return None


def find_place_by_text(query: str) -> Optional[Tuple[float, float]]:
    """Use Google Places Text Search API to find a place."""
    if not GOOGLE_API_KEY:
        return None
    
    # Try with different city contexts for ambiguous names
    search_variants = [
        f"{query}, Dallas Fort Worth, Texas",
        f"{query}, Texas",
    ]
    
    # For generic street/place names, try specific DFW cities
    dfw_cities = ['Dallas', 'Fort Worth', 'Arlington', 'Plano', 'Frisco', 
                  'McKinney', 'Denton', 'Lewisville', 'Flower Mound', 'Carrollton']
    if not any(city.lower() in query.lower() for city in dfw_cities):
        for city in dfw_cities[:5]:  # Try top 5 cities
            search_variants.append(f"{query}, {city}, TX")
    
    for search in search_variants:
        url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        params = {
            'query': search,
            'location': f'{DFW_CENTER[0]},{DFW_CENTER[1]}',
            'radius': 150000,
            'key': GOOGLE_API_KEY
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            if data.get('status') == 'OK' and data.get('results'):
                loc = data['results'][0]['geometry']['location']
                lat, lng = loc['lat'], loc['lng']
                # Verify it's in North Texas area
                if 32.0 < lat < 33.8 and -98.0 < lng < -96.0:
                    return (lat, lng)
        except Exception as e:
            continue
    
    return None


def read_csv(file_path: str) -> List[Dict]:
    """Read Google Maps export CSV."""
    locations = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    header_idx = None
    for i, line in enumerate(lines):
        if line.startswith('Title,'):
            header_idx = i
            break
    
    if header_idx is None:
        print("ERROR: Could not find CSV header row")
        return []
    
    csv_content = '\n'.join(lines[header_idx:])
    reader = csv.DictReader(csv_content.split('\n'))
    
    for row in reader:
        title = (row.get('Title') or '').strip()
        note = (row.get('Note') or '').strip()
        url = (row.get('URL') or '').strip()
        
        if not title and not url:
            continue
            
        locations.append({
            'title': title,
            'note': note,
            'url': url,
        })
    
    print(f"✓ Read {len(locations)} entries from CSV")
    return locations


def process_locations(entries: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
    """Process entries using Google APIs to get coordinates."""
    ready = []
    needs_review = []
    
    print(f"\n📍 Processing {len(entries)} entries...")
    print(f"   Using Google API Key: {'✓ Found' if GOOGLE_API_KEY else '✗ Missing!'}")
    
    if not GOOGLE_API_KEY:
        print("\nERROR: No GOOGLE_API_KEY found in .env file")
        sys.exit(1)
    
    for i, entry in enumerate(entries, 1):
        title = entry['title']
        note = entry['note']
        url = entry['url']
        
        print(f"[{i}/{len(entries)}] {title[:45]}...", end=' ')
        
        # Method 1: Direct coordinates in URL
        coords = extract_coords_from_url(url)
        if coords:
            print(f"✓ URL coords")
            ready.append({
                'address': title,
                'description': note,
                'lat': coords[0],
                'lng': coords[1],
                'googleMapsUrl': url,
                'source': 'google-maps-import',
            })
            continue
        
        # Method 2: Geocode if it's a street address
        if is_street_address(title):
            coords = geocode_address(title)
            if coords:
                print(f"✓ Geocoded address")
                ready.append({
                    'address': title,
                    'description': note,
                    'lat': coords[0],
                    'lng': coords[1],
                    'googleMapsUrl': url,
                    'source': 'google-maps-import',
                })
                time.sleep(0.1)  # Rate limit
                continue
        
        # Method 3: Find place by name (for non-address entries)
        place_name = extract_place_name_from_url(url) or title
        coords = find_place_by_text(place_name)
        if coords:
            print(f"✓ Found place")
            ready.append({
                'address': place_name,
                'description': note,
                'lat': coords[0],
                'lng': coords[1],
                'googleMapsUrl': url,
                'source': 'google-maps-import',
            })
            time.sleep(0.1)  # Rate limit
            continue
        
        # Failed all methods - needs manual review
        print(f"⚠ Needs review")
        needs_review.append({
            'address': title,
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
                'lat': Decimal(str(round(loc['lat'], 6))),
                'lng': Decimal(str(round(loc['lng'], 6))),
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
    
    print(f"\n📤 Creating {len(entries)} suggestions for review...")
    
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
                'description': entry.get('description', '') or 'Imported - needs coordinates',
                'lat': Decimal('0'),
                'lng': Decimal('0'),
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
    
    print("🎄 DFW Christmas Lights - Location Importer v3")
    print("=" * 50)
    
    entries = read_csv(args.input_csv)
    if not entries:
        print("ERROR: No entries found")
        sys.exit(1)
    
    ready, needs_review = process_locations(entries)
    
    print("\n" + "=" * 50)
    print("📊 Summary:")
    print(f"   Total entries: {len(entries)}")
    print(f"   Ready for import: {len(ready)}")
    print(f"   Need admin review: {len(needs_review)}")
    
    if args.dry_run:
        print("\n🔍 DRY RUN - No changes made")
        if needs_review:
            print("\nEntries needing review:")
            for e in needs_review:
                print(f"  - {e['address']}")
        return
    
    confirm = input(f"\n⚠️  Import {len(ready)} locations and create {len(needs_review)} suggestions? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Aborted.")
        return
    
    if ready:
        import_to_locations(ready, args.locations_table)
    
    if needs_review:
        import_to_suggestions(needs_review, args.suggestions_table)
    
    print("\n✅ Import complete!")


if __name__ == '__main__':
    main()
