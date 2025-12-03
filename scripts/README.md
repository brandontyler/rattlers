# Scripts Directory

Utility scripts for the DFW Christmas Lights Finder project.

## Available Scripts

### 1. `import_locations.py` - Import Google Maps Export

Import and geocode locations from your Google Maps export.

**Features:**
- Reads Google Takeout CSV exports
- Geocodes addresses to lat/lng coordinates
- Validates and cleans data
- Exports to CSV/JSON
- Optionally imports directly to DynamoDB

**Installation:**
```bash
uv sync
```

**Usage:**

```bash
# Basic usage - geocode and save to CSV
uv run python import_locations.py your_export.csv --output-csv geocoded.csv

# Using Google Geocoding API (more accurate, but requires API key)
uv run python import_locations.py your_export.csv \
  --geocode google \
  --google-api-key YOUR_API_KEY \
  --output-csv geocoded.csv

# Geocode and import directly to DynamoDB
uv run python import_locations.py your_export.csv \
  --output-csv geocoded.csv \
  --import-to-dynamodb \
  --table-name christmas-lights-locations-dev

# Save as JSON for inspection
uv run python import_locations.py your_export.csv \
  --output-json locations.json
```

**Options:**
- `--geocode` - Geocoding service: `nominatim` (free, slow) or `google` (paid, fast)
- `--google-api-key` - Google Geocoding API key (required if using `google`)
- `--output-csv` - Save geocoded data to CSV
- `--output-json` - Save geocoded data to JSON
- `--import-to-dynamodb` - Import to DynamoDB after geocoding
- `--table-name` - DynamoDB table name (defaults to env var or `christmas-lights-locations-dev`)

**Example Workflow:**

1. Export from Google Maps (see `/docs/GOOGLE_MAPS_EXPORT_GUIDE.md`)
2. Run geocoding:
   ```bash
   uv run python import_locations.py my_export.csv --output-csv geocoded.csv
   ```
3. Review the geocoded.csv file
4. Import to DynamoDB:
   ```bash
   uv run python import_locations.py geocoded.csv --import-to-dynamodb
   ```

**Geocoding Services:**

**Nominatim (OpenStreetMap):**
- ✅ Free
- ✅ No API key required
- ✅ Good for testing
- ❌ Slower (1 request per second)
- ❌ Less accurate sometimes

**Google Geocoding API:**
- ✅ Very accurate
- ✅ Fast (10 requests per second)
- ✅ $200 free credit per month
- ❌ Requires API key
- ❌ Costs $5 per 1000 requests after free tier

For 148 locations:
- Nominatim: ~3 minutes, $0
- Google: ~15 seconds, ~$0.74 (covered by free tier)

**Getting a Google Geocoding API Key:**

1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Enable "Geocoding API"
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Restrict the key to "Geocoding API" only (for security)
6. Copy the API key

---

### 2. `deploy.sh` - Full Deployment Script

Deploy the entire application to AWS.

**Usage:**
```bash
./deploy.sh [dev|prod]
```

**What it does:**
1. Deploys infrastructure with CDK
2. Gets stack outputs (API URL, Cognito IDs, etc.)
3. Builds frontend with correct environment variables
4. Uploads frontend to S3
5. Invalidates CloudFront cache

**Example:**
```bash
# Deploy to development
./deploy.sh dev

# Deploy to production
./deploy.sh prod
```

**Prerequisites:**
- AWS CLI configured
- AWS CDK installed
- Correct AWS credentials

---

## Common Tasks

### Import Your 148 Christmas Light Locations

1. **Export from Google Maps:**
   ```bash
   # Follow guide: /docs/GOOGLE_MAPS_EXPORT_GUIDE.md
   # You'll get a CSV file from Google Takeout
   ```

2. **Geocode the addresses:**
   ```bash
   cd scripts
   uv sync

   # Using free Nominatim (slower but free)
   uv run python import_locations.py ~/Downloads/Takeout/Maps/Saved\ Places.csv \
     --output-csv christmas_lights_geocoded.csv

   # OR using Google API (faster, more accurate)
   uv run python import_locations.py ~/Downloads/Takeout/Maps/Saved\ Places.csv \
     --geocode google \
     --google-api-key YOUR_API_KEY \
     --output-csv christmas_lights_geocoded.csv
   ```

3. **Review the geocoded data:**
   ```bash
   # Open christmas_lights_geocoded.csv
   # Check that addresses geocoded correctly
   # Fix any failed geocoding manually
   ```

4. **Import to DynamoDB:**
   ```bash
   # Make sure infrastructure is deployed first
   export AWS_REGION=us-east-1

   uv run python import_locations.py christmas_lights_geocoded.csv \
     --import-to-dynamodb \
     --table-name christmas-lights-locations-dev
   ```

5. **Verify:**
   ```bash
   # Check DynamoDB in AWS Console
   # Or test API endpoint: GET /locations
   ```

---

## Troubleshooting

### "Module not found: geopy"
```bash
uv sync
```

### "Google API key required"
You need a Google Geocoding API key to use `--geocode google`. Either:
- Get a Google API key (see guide above)
- Use `--geocode nominatim` (free, slower)

### "Could not geocode: [address]"
Some addresses might be incomplete or invalid. Options:
- Manually fix the address in the CSV
- Add more context (e.g., add "Dallas, TX" to partial addresses)
- Use Google geocoding instead of Nominatim (more accurate)

### "DynamoDB table not found"
Make sure:
- Infrastructure is deployed: `cd infrastructure && uv run cdk deploy`
- Table name is correct: check CloudFormation outputs
- AWS credentials have DynamoDB permissions

### Geocoding is slow
- Nominatim is limited to 1 request per second (148 locations = ~3 minutes)
- Use Google Geocoding API for faster results (~15 seconds)
- The script shows progress, so you can monitor it

---

## Environment Variables

Scripts may use these environment variables:

- `AWS_REGION` - AWS region (default: us-east-1)
- `AWS_PROFILE` - AWS CLI profile to use
- `LOCATIONS_TABLE_NAME` - DynamoDB table for locations
- `GOOGLE_GEOCODING_API_KEY` - Alternative to --google-api-key flag

Set in your shell:
```bash
export AWS_REGION=us-east-1
export GOOGLE_GEOCODING_API_KEY=your-key-here
```

---

## Script Development

### Adding a New Script

1. Create the script in `/scripts/`
2. Make it executable: `chmod +x script_name.sh`
3. Add description to this README
4. Update Makefile if it's a common task
5. Test thoroughly before committing

### Testing Import Script

```bash
# Create a test CSV
cat > test_locations.csv << EOF
Title,Note,Address
"Test House 1","Great lights","123 Main St, Dallas, TX 75201"
"Test House 2","Nice display","456 Elm St, Plano, TX 75024"
EOF

# Test geocoding only
python import_locations.py test_locations.csv --output-json test_output.json

# Check the output
cat test_output.json
```

---

## Next Scripts to Build

Potential future scripts:

- `backup_locations.py` - Backup DynamoDB to CSV
- `add_photos.py` - Bulk add photos to locations
- `generate_sitemap.py` - Generate sitemap.xml
- `export_routes.py` - Export saved routes
- `migrate_data.py` - Migrate between environments
- `seed_test_data.py` - Create test data for development

---

## Questions?

See main project documentation:
- `/docs/GOOGLE_MAPS_EXPORT_GUIDE.md` - Exporting from Google Maps
- `/docs/SESSION_PROGRESS.md` - Project overview
- `/docs/ARCHITECTURE.md` - System architecture
