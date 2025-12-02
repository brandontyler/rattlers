#!/usr/bin/env python3
"""
Import locations from Google Maps export CSV.

This script:
1. Reads a CSV export from Google Takeout
2. Geocodes addresses to get lat/lng coordinates
3. Cleans and validates the data
4. Imports locations into DynamoDB

Usage:
    python import_locations.py input.csv [--geocode-api google|nominatim]
"""

import csv
import json
import sys
import time
import argparse
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import os

# Install these with: pip install geopy boto3
try:
    from geopy.geocoders import Nominatim, GoogleV3
    from geopy.exc import GeocoderTimedOut, GeocoderServiceError
    import boto3
    from boto3.dynamodb.conditions import Key
except ImportError:
    print("ERROR: Missing required packages.")
    print("Please install: pip install geopy boto3")
    sys.exit(1)


class LocationImporter:
    """Import and geocode locations from Google Maps export."""

    def __init__(self, geocode_service: str = "nominatim", google_api_key: Optional[str] = None):
        """
        Initialize the importer.

        Args:
            geocode_service: 'nominatim' (free, slow) or 'google' (paid, fast)
            google_api_key: Google Geocoding API key (required if using 'google')
        """
        self.geocode_service = geocode_service

        if geocode_service == "nominatim":
            self.geocoder = Nominatim(user_agent="dfw-christmas-lights-importer")
            self.rate_limit = 1.0  # Nominatim requires 1 second between requests
        elif geocode_service == "google":
            if not google_api_key:
                raise ValueError("Google API key required for Google geocoding")
            self.geocoder = GoogleV3(api_key=google_api_key)
            self.rate_limit = 0.1  # Google allows higher rate
        elif geocode_service == "aws":
            self.geocoder = None  # Will use boto3 directly
            self.location_client = boto3.client('location')
            self.place_index = "christmas-lights-geocoder"
            self.rate_limit = 0.1  # AWS allows high rate
        else:
            raise ValueError(f"Unknown geocoding service: {geocode_service}")

        # DynamoDB client (will initialize when needed)
        self.dynamodb = None
        self.locations_table = None

    def read_csv(self, file_path: str) -> List[Dict]:
        """
        Read Google Maps export CSV.

        Expected columns: Title, Note, URL, Address
        (or variations like: Name, Description, Link, Location)
        """
        locations = []

        with open(file_path, 'r', encoding='utf-8') as f:
            # Try to detect the CSV format
            sample = f.read(1024)
            f.seek(0)

            # Check if it's a Google Takeout format
            reader = csv.DictReader(f)

            for row in reader:
                # Handle different possible column names
                location = {
                    'title': (
                        row.get('Title') or
                        row.get('Name') or
                        row.get('title') or
                        row.get('name') or
                        ''
                    ).strip(),
                    'note': (
                        row.get('Note') or
                        row.get('Description') or
                        row.get('note') or
                        row.get('description') or
                        ''
                    ).strip(),
                    'address': (
                        row.get('Address') or
                        row.get('Location') or
                        row.get('address') or
                        row.get('location') or
                        row.get('Title')  # Sometimes address is in title
                    ).strip(),
                    'url': (
                        row.get('URL') or
                        row.get('Link') or
                        row.get('url') or
                        row.get('link') or
                        ''
                    ).strip(),
                }

                # Skip empty rows
                if location['address'] or location['title']:
                    locations.append(location)

        print(f"✓ Read {len(locations)} locations from CSV")
        return locations

    def geocode_address(self, address: str, retry: int = 3) -> Optional[Tuple[float, float]]:
        """
        Geocode an address to get latitude and longitude.

        Args:
            address: The address to geocode
            retry: Number of retries on failure

        Returns:
            Tuple of (latitude, longitude) or None if geocoding fails
        """
        # Add DFW area context to improve accuracy
        search_address = address
        if 'TX' not in address.upper() and 'TEXAS' not in address.upper():
            search_address = f"{address}, Dallas-Fort Worth, TX"

        for attempt in range(retry):
            try:
                if self.geocode_service == "aws":
                    # Use Amazon Location Service
                    response = self.location_client.search_place_index_for_text(
                        IndexName=self.place_index,
                        Text=search_address,
                        MaxResults=1,
                        BiasPosition=[-96.7970, 32.7767],  # DFW center,
                    )
                    if response.get('Results'):
                        point = response['Results'][0]['Place']['Geometry']['Point']
                        # AWS returns [lng, lat], we need (lat, lng)
                        time.sleep(self.rate_limit)
                        return (point[1], point[0])
                    else:
                        print(f"  ⚠ Could not geocode: {address}")
                        return None
                else:
                    # Use geopy geocoder (Nominatim or Google)
                    location = self.geocoder.geocode(search_address)
                    if location:
                        time.sleep(self.rate_limit)
                        return (location.latitude, location.longitude)
                    else:
                        print(f"  ⚠ Could not geocode: {address}")
                        return None

            except Exception as e:
                if attempt < retry - 1:
                    print(f"  ⚠ Geocoding error, retrying... ({attempt + 1}/{retry})")
                    time.sleep(2)
                else:
                    print(f"  ✗ Failed to geocode after {retry} attempts: {address}")
                    return None

        return None

    def geocode_locations(self, locations: List[Dict]) -> List[Dict]:
        """
        Geocode all locations that don't have coordinates.

        Args:
            locations: List of location dictionaries

        Returns:
            List of locations with lat/lng added
        """
        geocoded = []
        failed = []

        print(f"\n📍 Geocoding {len(locations)} addresses...")
        print(f"   Using: {self.geocode_service}")
        print(f"   Rate limit: {self.rate_limit}s between requests")
        print()

        for i, loc in enumerate(locations, 1):
            address = loc['address']
            print(f"[{i}/{len(locations)}] {address[:60]}...", end=' ')

            # Check if coordinates already exist
            if 'lat' in loc and 'lng' in loc:
                print("✓ (already has coordinates)")
                geocoded.append(loc)
                continue

            # Geocode the address
            coords = self.geocode_address(address)

            if coords:
                loc['lat'] = coords[0]
                loc['lng'] = coords[1]
                print(f"✓ ({coords[0]:.4f}, {coords[1]:.4f})")
                geocoded.append(loc)
            else:
                print("✗ Failed")
                failed.append(loc)

        print(f"\n✓ Successfully geocoded: {len(geocoded)}/{len(locations)}")

        if failed:
            print(f"✗ Failed to geocode: {len(failed)}")
            print("\nFailed addresses:")
            for loc in failed:
                print(f"  - {loc['address']}")

        return geocoded, failed

    def save_to_csv(self, locations: List[Dict], output_path: str):
        """Save geocoded locations to a CSV file."""
        fieldnames = ['address', 'description', 'lat', 'lng', 'photos', 'url', 'title']

        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for loc in locations:
                writer.writerow({
                    'address': loc['address'],
                    'description': loc.get('note', ''),
                    'lat': loc.get('lat', ''),
                    'lng': loc.get('lng', ''),
                    'photos': '',  # Photos not included in export
                    'url': loc.get('url', ''),
                    'title': loc.get('title', ''),
                })

        print(f"✓ Saved geocoded locations to: {output_path}")

    def save_to_json(self, locations: List[Dict], output_path: str):
        """Save locations to JSON for easy inspection."""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(locations, f, indent=2)

        print(f"✓ Saved JSON to: {output_path}")

    def init_dynamodb(self, table_name: str = None):
        """Initialize DynamoDB connection."""
        if not self.dynamodb:
            self.dynamodb = boto3.resource('dynamodb')

        if not table_name:
            table_name = os.environ.get('LOCATIONS_TABLE_NAME', 'christmas-lights-locations-dev')

        self.locations_table = self.dynamodb.Table(table_name)
        print(f"✓ Connected to DynamoDB table: {table_name}")

    def import_to_dynamodb(self, locations: List[Dict], batch_size: int = 25):
        """
        Import locations to DynamoDB in batches.

        Args:
            locations: List of location dictionaries with lat/lng
            batch_size: Number of items to write per batch (max 25 for DynamoDB)
        """
        if not self.locations_table:
            raise RuntimeError("DynamoDB not initialized. Call init_dynamodb() first.")

        print(f"\n📤 Importing {len(locations)} locations to DynamoDB...")

        imported = 0
        failed = []

        # Process in batches
        for i in range(0, len(locations), batch_size):
            batch = locations[i:i + batch_size]

            with self.locations_table.batch_writer() as writer:
                for loc in batch:
                    try:
                        # Generate UUID for location
                        import uuid
                        location_id = str(uuid.uuid4())

                        item = {
                            'PK': f'location#{location_id}',
                            'SK': 'metadata',
                            'id': location_id,
                            'address': loc['address'],
                            'lat': float(loc['lat']),
                            'lng': float(loc['lng']),
                            'description': loc.get('note', ''),
                            'photos': [],
                            'status': 'active',
                            'feedbackCount': 0,
                            'averageRating': 0.0,
                            'likeCount': 0,
                            'reportCount': 0,
                            'createdBy': 'import-script',
                        }

                        writer.put_item(Item=item)
                        imported += 1
                        print(f"  ✓ Imported [{imported}/{len(locations)}]: {loc['address'][:50]}...")

                    except Exception as e:
                        print(f"  ✗ Failed to import: {loc['address']} - {str(e)}")
                        failed.append(loc)

        print(f"\n✓ Successfully imported: {imported}/{len(locations)}")

        if failed:
            print(f"✗ Failed to import: {len(failed)}")
            for loc in failed:
                print(f"  - {loc['address']}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Import Google Maps locations')
    parser.add_argument('input_csv', help='Path to Google Maps export CSV')
    parser.add_argument('--geocode', choices=['nominatim', 'google', 'aws'], default='nominatim',
                        help='Geocoding service to use (default: nominatim)')
    parser.add_argument('--google-api-key', help='Google Geocoding API key (required for --geocode google)')
    parser.add_argument('--output-csv', help='Output CSV file path (optional)')
    parser.add_argument('--output-json', help='Output JSON file path (optional)')
    parser.add_argument('--import-to-dynamodb', action='store_true',
                        help='Import to DynamoDB after geocoding')
    parser.add_argument('--table-name', help='DynamoDB table name')

    args = parser.parse_args()

    # Validate input file
    if not Path(args.input_csv).exists():
        print(f"ERROR: File not found: {args.input_csv}")
        sys.exit(1)

    # Initialize importer
    try:
        importer = LocationImporter(
            geocode_service=args.geocode,
            google_api_key=args.google_api_key
        )
    except ValueError as e:
        print(f"ERROR: {e}")
        sys.exit(1)

    # Read CSV
    print("🎄 DFW Christmas Lights - Location Importer")
    print("=" * 50)
    locations = importer.read_csv(args.input_csv)

    if not locations:
        print("ERROR: No locations found in CSV")
        sys.exit(1)

    # Geocode locations
    geocoded, failed = importer.geocode_locations(locations)

    # Save outputs
    if args.output_csv:
        importer.save_to_csv(geocoded, args.output_csv)

    if args.output_json:
        importer.save_to_json(geocoded, args.output_json)

    # Import to DynamoDB
    if args.import_to_dynamodb:
        if not geocoded:
            print("\nNo locations to import (all geocoding failed)")
            sys.exit(1)

        importer.init_dynamodb(args.table_name)
        importer.import_to_dynamodb(geocoded)

    # Summary
    print("\n" + "=" * 50)
    print("✅ Import complete!")
    print(f"   Total locations: {len(locations)}")
    print(f"   Successfully geocoded: {len(geocoded)}")
    print(f"   Failed: {len(failed)}")

    if failed:
        print("\n⚠️  You may need to manually fix failed addresses")
        print("   Check the addresses and try geocoding again")


if __name__ == '__main__':
    main()
