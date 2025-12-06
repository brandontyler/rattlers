# Test Plan - DFW Christmas Lights Finder

**Last Updated:** December 6, 2025
**Test Environment:** https://d173b693cir3zc.cloudfront.net (dev)
**API Endpoint:** https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1

---

## Test Credentials

| User | Email | Password | Role |
|------|-------|----------|------|
| Admin User | brandon.tyler@gmail.com | (your password) | Admin |
| Test User | testuser@example.com | TestPass123! | User |

---

## 1. Map & Locations (HomePage)

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 1.1 | Map loads | Go to homepage | Map displays centered on DFW | [ ] |
| 1.2 | Locations display | Zoom out on map | 147+ markers visible | [ ] |
| 1.3 | Location count | Check header text | Shows correct display count | [ ] |
| 1.4 | "Near Me" button | Click "Near Me" button | Map centers on your location | [ ] |
| 1.5 | Location popup | Click any marker | Popup shows address, rating, "Add to Route" button | [ ] |
| 1.6 | View Details link | Click "View Details" on popup | Navigates to location detail page | [ ] |

---

## 2. Location Detail Page

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 2.1 | Page loads | Click "View Details" from any popup | Shows location details | [ ] |
| 2.2 | Get Directions | Click "Get Directions" button | Opens Google Maps with correct address | [ ] |
| 2.3 | Directions accuracy | Verify Google Maps destination | Shows exact address (not nearby house) | [ ] |
| 2.4 | Coordinates display | Check coordinates section | Shows lat/lng formatted to 4 decimals | [ ] |
| 2.5 | Invalid location ID | Go to `/location/invalid-id` | Shows "Location Not Found" message | [ ] |
| 2.6 | Back navigation | Click "Home" breadcrumb | Returns to map view | [ ] |

---

## 3. Route Planner

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 3.1 | Add to route | Click "Add to Route" on location popup | Location added, route panel appears | [ ] |
| 3.2 | Route panel shows | Add first location | Floating panel appears at bottom | [ ] |
| 3.3 | Stop counter | Add 3 locations | Panel shows "3 stops in route" | [ ] |
| 3.4 | Route visualization | Add 2+ locations | Green numbered markers and dashed polyline on map | [ ] |
| 3.5 | Remove stop | Click X on a stop in panel | Stop removed, markers update | [ ] |
| 3.6 | Reorder stops | Click up/down arrows on stop | Stop moves, route line updates | [ ] |
| 3.7 | Optimize route | Add 4+ stops, click "Optimize Route" | Stops reorder to minimize distance | [ ] |
| 3.8 | Route stats | Add multiple stops | Shows estimated time and distance | [ ] |
| 3.9 | Max stops limit | Try to add 16th stop | Stop not added (15 max) | [ ] |
| 3.10 | Clear route | Click "Clear All" | All stops removed, panel hides | [ ] |
| 3.11 | Panel collapse | Click collapse arrow | Panel minimizes to pill showing stop count | [ ] |
| 3.12 | Panel expand | Click collapsed pill | Panel expands to full view | [ ] |
| 3.13 | Duplicate prevention | Try adding same location twice | Location not duplicated | [ ] |

---

## 4. PDF Generation

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 4.1 | Generate PDF button | Build route with 3 stops | "Create PDF Route" button visible | [ ] |
| 4.2 | PDF download | Click "Create PDF Route" | PDF downloads/opens in new tab | [ ] |
| 4.3 | PDF content - header | Open generated PDF | Shows "Christmas Lights Adventure" title | [ ] |
| 4.4 | PDF content - stats | Check stats box | Shows stop count, miles, estimated time | [ ] |
| 4.5 | PDF content - map | Check map section | Static map image with markers visible | [ ] |
| 4.6 | PDF content - stops | Check route list | All stops listed with numbers and addresses | [ ] |
| 4.7 | PDF content - QR code | Check QR section | QR code present for Google Maps | [ ] |
| 4.8 | QR code works | Scan QR with phone | Opens Google Maps with route | [ ] |
| 4.9 | Long route QR split | Build 15-stop route, generate PDF | Shows 2 QR codes (Part 1, Part 2) | [ ] |
| 4.10 | PDF tips section | Check bottom of PDF | Shows driving tips | [ ] |
| 4.11 | Loading state | Click generate, observe button | Shows "Creating PDF..." while loading | [ ] |
| 4.12 | Error handling | Disconnect network, try generate | Shows error message | [ ] |

---

## 5. Authentication

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 5.1 | Login page loads | Go to `/login` | Login form displays | [ ] |
| 5.2 | Sign in success | Enter valid credentials | Redirects to previous page | [ ] |
| 5.3 | Login redirect | Click login from `/location/xyz` | After login, returns to `/location/xyz` | [ ] |
| 5.4 | Sign in failure | Enter wrong password | Shows error message | [ ] |
| 5.5 | Sign out | Click logout | Returns to logged out state | [ ] |
| 5.6 | Signup page loads | Go to `/signup` | Signup form displays | [ ] |
| 5.7 | Admin nav link | Login as admin user | "Admin" link appears in nav | [ ] |
| 5.8 | Admin nav hidden | Login as regular user | "Admin" link not visible | [ ] |

---

## 6. Submit Location Page

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 6.1 | Page requires auth | Go to `/submit` while logged out | Redirects to login | [ ] |
| 6.2 | Page loads | Login and go to `/submit` | Form displays | [ ] |
| 6.3 | Address autocomplete | Type "424 Headlee St" | Suggestions appear after 3 chars | [ ] |
| 6.4 | Select address | Click a suggestion | Address populates with lat/lng | [ ] |
| 6.5 | Description validation | Submit with < 20 chars | Shows validation error | [ ] |
| 6.6 | Submit success | Fill form and submit | Shows success message | [ ] |
| 6.7 | DynamoDB record | After submit, check DB | Suggestion created with status "pending" | [ ] |

---

## 7. Admin Dashboard

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 7.1 | Access denied | Login as regular user, go to `/admin` | Shows "Access Denied" | [ ] |
| 7.2 | Page loads | Login as admin, go to `/admin` | Dashboard displays | [ ] |
| 7.3 | Location count | Check "Total Locations" card | Shows actual count | [ ] |
| 7.4 | Pending suggestions | Check suggestions section | Shows pending submissions | [ ] |
| 7.5 | Approve suggestion | Click "Approve" on a suggestion | Suggestion removed, count increments | [ ] |
| 7.6 | Location created | After approve, check map | New location appears on map | [ ] |
| 7.7 | Reject suggestion | Click "Reject" on a suggestion | Suggestion removed from list | [ ] |
| 7.8 | Refresh button | Click "Refresh" | Reloads suggestions list | [ ] |
| 7.9 | Photo thumbnails | Check suggestions with photos | Shows thumbnail grid (up to 3 photos) | [ ] |
| 7.10 | Photo lightbox | Click photo thumbnail | Opens full-size lightbox view | [ ] |
| 7.11 | Lightbox navigation | Click next/prev in lightbox | Navigates between photos | [ ] |
| 7.12 | Lightbox close | Press ESC or click outside | Lightbox closes | [ ] |

---

## 8. Photo Upload (User)

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 8.1 | Upload area visible | Go to `/submit` | Photo upload area shows below description | [ ] |
| 8.2 | File limit text | Check upload area | Shows "max 20MB each" | [ ] |
| 8.3 | Upload JPEG | Select JPEG photo (< 20MB) | Photo thumbnail appears immediately | [ ] |
| 8.4 | Upload PNG | Select PNG photo | Photo thumbnail appears | [ ] |
| 8.5 | Upload HEIC (iPhone) | Select HEIC photo from iPhone | Photo thumbnail appears | [ ] |
| 8.6 | Large photo (6MB) | Upload 6MB iPhone photo | Accepts file, shows thumbnail | [ ] |
| 8.7 | Too large (25MB) | Try uploading 25MB photo | Shows error: "exceeds 20MB" | [ ] |
| 8.8 | Multiple photos | Upload 3 photos sequentially | All 3 thumbnails display | [ ] |
| 8.9 | Photo limit | Try uploading 4th photo | Blocked with "maximum of 3 photos" error | [ ] |
| 8.10 | Remove photo | Click X on photo thumbnail | Photo removed from list | [ ] |
| 8.11 | Upload progress | Submit form with photos | Shows "Uploading photo 1 of 3..." | [ ] |
| 8.12 | Invalid file type | Try uploading .txt file | Shows "Invalid file type" error | [ ] |

---

## 9. Photo Gallery (Public)

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 9.1 | Single photo display | View location with 1 photo | Shows single photo, no carousel controls | [ ] |
| 9.2 | Multiple photos | View location with 3 photos | Shows carousel with prev/next buttons | [ ] |
| 9.3 | Photo counter | Check top-right of photo | Shows "1 / 3" counter | [ ] |
| 9.4 | Next photo | Click right arrow button | Advances to next photo, counter updates | [ ] |
| 9.5 | Previous photo | Click left arrow button | Goes to previous photo | [ ] |
| 9.6 | Thumbnail strip | Scroll below photo | Shows thumbnail strip of all photos | [ ] |
| 9.7 | Thumbnail click | Click 3rd thumbnail | Jumps to 3rd photo immediately | [ ] |
| 9.8 | Active thumbnail | Check thumbnail borders | Current photo has burgundy border | [ ] |
| 9.9 | Hover hint | Hover over main photo | Shows "Click to view full size" message | [ ] |
| 9.10 | Open lightbox | Click main photo | Opens full-screen lightbox | [ ] |

---

## 10. Lightbox Viewer

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 10.1 | Lightbox display | Click photo to open lightbox | Photo displays full-screen with dark overlay | [ ] |
| 10.2 | Photo counter | Check top-left of lightbox | Shows "1 / 3" counter | [ ] |
| 10.3 | Keyboard hint | Check bottom of lightbox | Shows "Use arrow keys • ESC to close" | [ ] |
| 10.4 | Arrow key right | Press → key | Advances to next photo | [ ] |
| 10.5 | Arrow key left | Press ← key | Goes to previous photo | [ ] |
| 10.6 | ESC key | Press ESC | Closes lightbox | [ ] |
| 10.7 | Click outside | Click dark overlay | Closes lightbox | [ ] |
| 10.8 | Next button | Click right arrow button | Navigates to next photo | [ ] |
| 10.9 | Previous button | Click left arrow button | Navigates to previous photo | [ ] |
| 10.10 | Close button | Click X button (top-right) | Closes lightbox | [ ] |
| 10.11 | Body scroll lock | Open lightbox, try scrolling | Page doesn't scroll while lightbox open | [ ] |
| 10.12 | End of photos | At last photo, press → | Stays on last photo (doesn't wrap) | [ ] |

---

## 11. Map Popup Photos

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 11.1 | Photo thumbnail | Click marker with photo | Popup shows photo thumbnail at top | [ ] |
| 11.2 | Photo count badge | Check popup with 3 photos | Shows "📸 3" badge in bottom-right | [ ] |
| 11.3 | Single photo | Click marker with 1 photo | No photo count badge shown | [ ] |
| 11.4 | No photos | Click marker without photos | No photo area shown | [ ] |

---

## 8. API Endpoints (Backend)

### 8.1 Public Endpoints

```bash
# GET /locations - List all locations
curl -s "https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1/locations" | jq '.pagination.total'
```
- [ ] Returns correct count

```bash
# POST /routes/generate-pdf - Generate route PDF
curl -s -X POST "https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1/routes/generate-pdf" \
  -H "Content-Type: application/json" \
  -d '{"stops": [{"id":"1","lat":32.98,"lng":-96.75,"address":"123 Test St"},{"id":"2","lat":32.96,"lng":-96.73,"address":"456 Test Ave"}]}'
```
- [ ] Returns downloadUrl in response

### 8.2 Authenticated Endpoints (require Bearer token)

```bash
# POST /suggestions - Submit suggestion (requires auth)
curl -s -X POST "https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1/suggestions" \
  -H "Content-Type: application/json" \
  -d '{"address": "test", "description": "test"}'
```
- [ ] Returns 401 without token

---

## 12. Error Handling

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 12.1 | CORS on 401 | Make unauth request | Returns 401 with CORS headers | [ ] |
| 12.2 | Geocoder timeout | Submit address during slow network | Shows "try again" message | [ ] |
| 12.3 | PDF generation error | Send invalid stops data | Returns 400 with error message | [ ] |
| 12.4 | Photo upload failure | Disconnect network, upload photo | Shows error message | [ ] |
| 12.5 | Photo too large | Upload 25MB file | Shows descriptive error with file size | [ ] |

---

## 13. UI/UX

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 13.1 | Mobile responsive | View on mobile device | Layout adapts, nav collapses | [ ] |
| 13.2 | Route panel mobile | Add stops on mobile | Panel usable on small screen | [ ] |
| 13.3 | Loading states | Slow network, submit form | Shows loading spinner | [ ] |
| 13.4 | Error messages | Trigger validation error | Clear error message displayed | [ ] |
| 13.5 | Photo gallery mobile | View photos on mobile | Carousel works with touch | [ ] |
| 13.6 | Lightbox mobile | Open lightbox on mobile | Full-screen works, touch-friendly | [ ] |

---

## Test Summary

| Section | Total | Passed | Failed |
|---------|-------|--------|--------|
| 1. Map & Locations | 6 | | |
| 2. Location Detail | 6 | | |
| 3. Route Planner | 13 | | |
| 4. PDF Generation | 12 | | |
| 5. Authentication | 8 | | |
| 6. Submit Location | 7 | | |
| 7. Admin Dashboard | 12 | | |
| 8. Photo Upload | 12 | | |
| 9. Photo Gallery | 10 | | |
| 10. Lightbox Viewer | 12 | | |
| 11. Map Popup Photos | 4 | | |
| 12. Error Handling | 5 | | |
| 13. UI/UX | 6 | | |
| **TOTAL** | **113** | | |

---

## Known Issues

1. Nominatim geocoding can be slow (5-10 seconds) - retry logic added
2. Lat/lng precision may place map marker slightly off from actual house
3. Static map in PDF requires internet access from Lambda
4. Google Maps URL limited to 10 waypoints - routes >12 stops split into multiple QR codes

---

## Test History

| Date | Tester | Version | Result |
|------|--------|---------|--------|
| 2025-12-06 | - | v1.3 | Photo features complete - upload, compression, gallery, lightbox |
| 2025-12-04 | Brandon | v1.0 | Initial testing - core flows working |
| 2025-12-04 | - | v1.1 | Route planner + PDF generation added |

---

## Regression Tests (Run Before Each Release)

Quick smoke test checklist:

### Core Features
- [ ] Homepage loads with map and locations
- [ ] Can click marker and see popup with "Add to Route" button
- [ ] Can add locations to route and see numbered markers
- [ ] Can generate PDF with route
- [ ] PDF contains map, stops, and QR code
- [ ] QR code opens Google Maps with correct route
- [ ] Can view location detail page
- [ ] Get Directions opens correct address in Google Maps
- [ ] Can login and logout

### Photo Features
- [ ] Can upload photos with location suggestion (test with iPhone HEIC if available)
- [ ] Photos show thumbnail preview immediately after selection
- [ ] Can upload up to 3 photos (20MB max each)
- [ ] Admin can view and approve suggestions with photos
- [ ] Admin can click photo thumbnails to open lightbox
- [ ] Approved photos appear on location detail page
- [ ] Photo carousel works (prev/next buttons, thumbnails)
- [ ] Can open full-screen lightbox from detail page
- [ ] Lightbox keyboard navigation works (arrows, ESC)
- [ ] Map popups show photo count badge for locations with multiple photos

### User Features
- [ ] Can like/unlike locations
- [ ] Like count updates immediately (optimistic UI)
- [ ] Can report inactive displays
