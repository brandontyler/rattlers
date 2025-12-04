# Test Plan - DFW Christmas Lights Finder

**Last Updated:** December 4, 2025
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
| 1.1 | Map loads | Go to homepage | Map displays centered on DFW | [x] |
| 1.2 | Locations display | Zoom out on map | 147 markers visible | [x] |
| 1.3 | Location count | Check header text | Shows "147 spectacular displays" | [ ] |
| 1.4 | "Near Me" button | Click "Near Me" button | Map centers on your location | [x] |
| 1.5 | Location popup | Click any marker | Popup shows address, rating, like count | [x] |
| 1.6 | View Details link | Click "View Details" on popup | Navigates to location detail page | [x] |

---

## 2. Location Detail Page

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 2.1 | Page loads | Click "View Details" from any popup | Shows location details | [x] |
| 2.2 | Get Directions | Click "Get Directions" button | Opens Google Maps with correct address | [x] |
| 2.3 | Directions accuracy | Verify Google Maps destination | Shows exact address (not nearby house) | [x] |
| 2.4 | Coordinates display | Check coordinates section | Shows lat/lng formatted to 4 decimals | [x] |
| 2.5 | Invalid location ID | Go to `/location/invalid-id` | Shows "Location Not Found" message | [x] |
| 2.6 | Back navigation | Click "Home" breadcrumb | Returns to map view | [x] |

---

## 3. Authentication

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 3.1 | Login page loads | Go to `/login` | Login form displays | [x] |
| 3.2 | Sign in success | Enter valid credentials | Redirects to previous page | [x] |
| 3.3 | Login redirect | Click login from `/location/xyz` | After login, returns to `/location/xyz` | [ ] |
| 3.4 | Sign in failure | Enter wrong password | Shows error message | [x] |
| 3.5 | Sign out | Click logout | Returns to logged out state | [x] |
| 3.6 | Signup page loads | Go to `/signup` | Signup form displays | [x] |
| 3.7 | Admin nav link | Login as admin user | "Admin" link appears in nav | [x] |
| 3.8 | Admin nav hidden | Login as regular user | "Admin" link not visible | [ ] |

---

## 4. Submit Location Page

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 4.1 | Page requires auth | Go to `/submit` while logged out | Redirects to login | [x] |
| 4.2 | Page loads | Login and go to `/submit` | Form displays | [x] |
| 4.3 | Address autocomplete | Type "424 Headlee St" | Suggestions appear after 3 chars | [x] |
| 4.4 | Select address | Click a suggestion | Address populates with lat/lng | [x] |
| 4.5 | Description validation | Submit with < 20 chars | Shows validation error | [ ] |
| 4.6 | Submit success | Fill form and submit | Shows success message | [x] |
| 4.7 | DynamoDB record | After submit, check DB | Suggestion created with status "pending" | [x] |

---

## 5. Admin Dashboard

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 5.1 | Access denied | Login as regular user, go to `/admin` | Shows "Access Denied" | [ ] |
| 5.2 | Page loads | Login as admin, go to `/admin` | Dashboard displays | [x] |
| 5.3 | Location count | Check "Total Locations" card | Shows actual count (147) | [x] |
| 5.4 | Pending suggestions | Check suggestions section | Shows pending submissions | [x] |
| 5.5 | Approve suggestion | Click "Approve" on a suggestion | Suggestion removed, count increments | [x] |
| 5.6 | Location created | After approve, check map | New location appears on map | [x] |
| 5.7 | Reject suggestion | Click "Reject" on a suggestion | Suggestion removed from list | [ ] |
| 5.8 | Refresh button | Click "Refresh" | Reloads suggestions list | [ ] |

---

## 6. API Endpoints (Backend)

### 6.1 Public Endpoints

```bash
# GET /locations - List all locations
curl -s "https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1/locations" | jq '.pagination.total'
# Expected: 147
```
- [ ] Returns correct count

```bash
# GET /locations/{id} - Get location details
curl -s "https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1/locations/c6256460-be0d-460f-99f7-01908236cd3a" | jq '.data.address'
# Expected: "424, Headlee Street, Denton..."
```
- [ ] Returns location data

```bash
# POST /locations/suggest-addresses - Geocode address
curl -s -X POST "https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1/locations/suggest-addresses" \
  -H "Content-Type: application/json" \
  -d '{"query": "424 Headlee St, Denton"}'
```
- [ ] Returns address suggestions with lat/lng

### 6.2 Authenticated Endpoints (require Bearer token)

```bash
# POST /suggestions - Submit suggestion (requires auth)
curl -s -X POST "https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1/suggestions" \
  -H "Content-Type: application/json" \
  -d '{"address": "test", "description": "test"}'
# Expected: 401 Unauthorized
```
- [ ] Returns 401 without token

### 6.3 Admin Endpoints (require admin token)

```bash
# GET /suggestions - List pending (requires admin)
curl -s "https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1/suggestions?status=pending"
# Expected: 401 Unauthorized
```
- [ ] Returns 401 without token

---

## 7. Error Handling

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 7.1 | CORS on 401 | Make unauth request | Returns 401 with CORS headers (not CORS error) | [x] |
| 7.2 | Geocoder timeout | Submit address during slow network | Shows "try again" message, not crash | [x] |
| 7.3 | Invalid JSON | Send malformed request body | Returns 400 Bad Request | [ ] |

---

## 8. Data Integrity

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 8.1 | Suggestion to location | Approve suggestion | Location has correct address, lat, lng | [x] |
| 8.2 | Lat/lng as numbers | Check approved location in DB | lat/lng stored as Number type | [x] |
| 8.3 | PK/SK format | Check location in DB | PK: "location#uuid", SK: "metadata" | [x] |

---

## 9. UI/UX

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 9.1 | Mobile responsive | View on mobile device | Layout adapts, nav collapses | [ ] |
| 9.2 | Loading states | Slow network, submit form | Shows loading spinner | [x] |
| 9.3 | Error messages | Trigger validation error | Clear error message displayed | [x] |
| 9.4 | Success feedback | Complete an action | Success message/state shown | [x] |

---

## Test Summary

| Section | Total | Passed | Failed |
|---------|-------|--------|--------|
| 1. Map & Locations | 6 | | |
| 2. Location Detail | 6 | | |
| 3. Authentication | 8 | | |
| 4. Submit Location | 7 | | |
| 5. Admin Dashboard | 8 | | |
| 6. API Endpoints | 5 | | |
| 7. Error Handling | 3 | | |
| 8. Data Integrity | 3 | | |
| 9. UI/UX | 4 | | |
| **TOTAL** | **50** | | |

---

## Known Issues

1. Nominatim geocoding can be slow (5-10 seconds) - retry logic added
2. Lat/lng precision may place map marker slightly off from actual house - directions use address string for accuracy

---

## Test History

| Date | Tester | Version | Result |
|------|--------|---------|--------|
| 2025-12-04 | Brandon | v1.0 | Initial testing - core flows working |

---

## Regression Tests (Run Before Each Release)

Quick smoke test checklist:

- [ ] Homepage loads with map and locations
- [ ] Can click marker and see popup
- [ ] Can view location detail page
- [ ] Get Directions opens correct address in Google Maps
- [ ] Can login and logout
- [ ] Can submit a location suggestion (as logged-in user)
- [ ] Admin can view and approve suggestions
- [ ] Approved location appears on map
