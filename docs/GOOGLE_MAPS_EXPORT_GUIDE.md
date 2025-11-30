# Exporting Your Google Maps List - Complete Guide

This guide will help you export your "Christmas Lights in DFW" list from Google Maps.

**Your List:** https://maps.app.goo.gl/EMcLPT8eM2ey4vVHA

---

## Method 1: Google Takeout (Recommended - Official Method)

This is Google's official export tool and the most reliable method.

### Steps:

1. **Go to Google Takeout**
   - Visit: https://takeout.google.com/settings/takeout
   - Sign in with the same Google account that has your Christmas lights list

2. **Select Data to Export**
   - Click "Deselect all" at the top
   - Scroll down and find "**Maps (your places)**" - Check this box
   - Click on "**Multiple formats**" button next to it
   - Choose CSV format (easier to work with)

3. **Create Export**
   - Click "Next step" at the bottom
   - Choose delivery method (recommended: "Send download link via email")
   - Choose frequency: "Export once"
   - Choose file type: ".zip"
   - Click "Create export"

4. **Download Your Data**
   - Wait for Google to prepare your export (can take minutes to hours)
   - You'll get an email when it's ready
   - Download the ZIP file
   - Extract it

5. **Find Your List**
   - Navigate to: `Takeout/Maps (your places)/Saved Places.csv`
   - Your "Christmas Lights in DFW" list should be in there
   - Each list is exported as a separate CSV file

### ⚠️ Important Limitations:

**Google Takeout CSV files typically include:**
- ✅ Location names
- ✅ Addresses
- ✅ Notes/descriptions
- ✅ URLs to Google Maps

**But may NOT include:**
- ❌ Latitude/Longitude coordinates (need geocoding)
- ❌ Photos
- ❌ Category/tags

This means we'll need to **geocode** the addresses to get lat/lng coordinates for the map.

---

## Method 2: Manual Copy-Paste (Quick & Dirty)

For smaller lists or immediate results.

### Steps:

1. **Open Your List**
   - Go to https://maps.app.goo.gl/EMcLPT8eM2ey4vVHA
   - Or: Google Maps → Menu (☰) → "Your places" → "Saved" tab → "Christmas Lights in DFW"

2. **Select All Locations**
   - Click on the first location
   - Scroll to the bottom
   - Hold Shift and click the last location (selects all)
   - OR: Click and drag to highlight all entries

3. **Copy**
   - Right-click and select "Copy"
   - OR: Ctrl+C (Windows) / Cmd+C (Mac)

4. **Paste into Spreadsheet**
   - Open Excel, Google Sheets, or any text editor
   - Paste (Ctrl+V / Cmd+V)
   - Save as CSV

5. **Clean Up the Data**
   - Remove extra formatting
   - Separate address from name if needed
   - Each row should be one location

### ⚠️ Limitations:
- No coordinates included
- May have messy formatting
- Need to manually clean data
- Time-consuming for 148 locations

---

## Method 3: Third-Party Tools

### Option A: Browser Extension/Script

There are Chrome extensions that can scrape Google Maps lists, but:
- ⚠️ Use at your own risk
- May violate Google's Terms of Service
- Can break with Google Maps updates

### Option B: Web Services

Services like:
- **Export GM** (https://exportgooglemaps.com/)
- Various Google Maps scrapers

**Caution:** These require access to your Google account or list URL. Only use trusted services.

---

## What Format Will You Get?

Depending on the method, you'll get something like:

### CSV Format Example:
```csv
Title,Note,URL,Address
"123 Main St Display","Great synchronized lights","https://maps.google.com/...","123 Main St, Dallas, TX 75001"
"456 Oak Ave","Amazing inflatables","https://maps.google.com/...","456 Oak Ave, Plano, TX 75024"
```

### What We Need for the App:
```csv
address,description,lat,lng,photos
"123 Main St, Dallas, TX 75001","Great synchronized lights",32.7767,-96.7970,""
"456 Oak Ave, Plano, TX 75024","Amazing inflatables",33.0198,-96.6989,""
```

---

## Next Step: Geocoding (Getting Coordinates)

Since Google Takeout doesn't include lat/lng, we need to **geocode** the addresses.

I'll create a Python script that:
1. Reads your exported CSV
2. Uses a geocoding service to convert addresses → coordinates
3. Outputs a cleaned CSV ready to import into the app

**Geocoding Options:**
- **Google Geocoding API** - $5 per 1000 requests (you get $200 credit/month free)
- **Nominatim (OpenStreetMap)** - Free but slower
- **Mapbox** - 100,000 free requests/month

For 148 locations, any option will work fine!

---

## Recommended Workflow

**For your 148 Christmas light locations:**

1. ✅ **Use Google Takeout** (Method 1)
   - Most reliable
   - Official method
   - Gets all your data

2. ✅ **Export as CSV**

3. ✅ **Run geocoding script** (I'll create this for you)
   - Converts addresses to coordinates
   - Cleans up the data
   - Validates addresses

4. ✅ **Import into your app**
   - Bulk upload to DynamoDB
   - Or use admin interface (once built)

---

## Try This Now:

1. Go to https://takeout.google.com/settings/takeout
2. Deselect all → Select "Maps (your places)"
3. Create export
4. While waiting, let me know and I can create the geocoding script!

Once you have the CSV file, we can:
- Clean it up
- Geocode addresses to get lat/lng
- Import all 148 locations into your app database

---

## Questions?

**Q: How long does Takeout take?**
A: Usually 5-30 minutes for Maps data, sometimes up to a few hours.

**Q: Will this include my photos?**
A: Unfortunately, no. Photos attached to saved places aren't included in exports. You may need to re-add photos through the app.

**Q: What if some addresses are incomplete?**
A: The geocoding script will flag those, and we can manually fix them.

**Q: Can I update the list and re-export?**
A: Yes! You can export as many times as needed.

---

## Next Steps

Once you have your CSV file:
1. Share it with me (or tell me it's ready)
2. I'll create a geocoding + import script
3. We'll clean up any bad addresses
4. Bulk import all 148 locations into your app!

Let me know when you're ready to proceed! 🎄
