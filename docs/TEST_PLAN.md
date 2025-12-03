# Test Plan - DFW Christmas Lights Finder

**Last Updated:** December 3, 2025
**Test Environment:** http://localhost:5173 (dev)
**API Endpoint:** https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1

---

## Test Credentials

| User | Email | Password | Role |
|------|-------|----------|------|
| Test User | testuser@example.com | TestPass123! | User |

---

## 1. Map & Locations (HomePage)

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 1.1 | Map loads | Go to http://localhost:5173 | Map displays centered on DFW | [ ] |
| 1.2 | Locations display | Zoom out on map | 146 markers visible | [ ] |
| 1.3 | "Near Me" button | Click "Near Me" button | Map centers on your location (may prompt for permission) | [ ] |
| 1.4 | Location popup | Click any marker | Popup shows address, rating, like count | [ ] |
| 1.5 | Popup like (auth) | Sign in, click Like on popup | Like count increments, button changes to "Unlike" | [ ] |
| 1.6 | Popup unlike (auth) | Click "Unlike" on already-liked location | Like count decrements, button changes to "Like" | [ ] |
| 1.7 | Popup like persists | Like a location, close/reopen popup | Button shows "Unlike" (maintains state) | [ ] |
| 1.8 | Popup optimistic update | Click Like | Button updates instantly before server responds | [ ] |
| 1.9 | Popup report (auth) | Sign in, click Report on popup | Button shows "Reported" | [ ] |
| 1.10 | Popup like (no auth) | Sign out, click Like on popup | Shows "Sign in to like" message | [ ] |
| 1.11 | View Details link | Click "View Details" on popup | Navigates to location detail page | [ ] |

---

## 2. Location Detail Page

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 2.1 | Page loads real data | Click "View Details" from any popup | Shows real address (not "123 Christmas Lane") | [ ] |
| 2.2 | Direct URL access | Go to `/location/5755eb1f-403b-4c7d-a154-7eed0c9ecc01` | Shows "119 Magnolia Ln" with stats | [ ] |
| 2.3 | Get Directions | Click "Get Directions" button | Opens Google Maps with location | [ ] |
| 2.4 | Like button (auth) | Sign in, click Like | Count updates, button changes to "Unlike" | [ ] |
| 2.5 | Unlike button (auth) | Click "Unlike" on already-liked location | Count decrements, button changes to "Like" | [ ] |
| 2.6 | Like state on page load | Like location, refresh page | Button shows "Unlike" on reload | [ ] |
| 2.7 | Rapid clicking prevention | Quickly click Like/Unlike multiple times | Button disables during request, prevents duplicate likes | [ ] |
| 2.8 | Report button (auth) | Sign in, click "Report Issue" | Button shows "Reported - Thank you!" | [ ] |
| 2.9 | Like button (no auth) | Sign out, click Like | Button disabled or shows sign-in prompt | [ ] |
| 2.10 | Invalid location ID | Go to `/location/invalid-id-here` | Shows "Location Not Found" message | [ ] |
| 2.11 | Back navigation | Click "Home" breadcrumb | Returns to map view | [ ] |

---

## 3. Authentication

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 3.1 | Login page loads | Go to `/login` | Login form displays | [x] |
| 3.2 | Sign in success | Enter testuser@example.com / TestPass123! | Redirects to home, shows logged in state | [x] |
| 3.3 | Sign in failure | Enter wrong password | Shows error message | [ ] |
| 3.4 | Sign out | Click logout/sign out | Returns to logged out state | [ ] |
| 3.5 | Signup page loads | Go to `/signup` | Signup form displays | [ ] |
| 3.6 | Protected actions | Try to Like without signing in | Prompts to sign in | [ ] |

---

## 4. API Endpoints (Backend)

Run these curl commands to test the API directly:

### 4.1 GET /locations
```bash
curl -s "https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1/locations?pageSize=3" | jq '.pagination'
```
- [x] Returns pagination with total: 146

### 4.2 GET /locations/{id}
```bash
curl -s "https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1/locations/5755eb1f-403b-4c7d-a154-7eed0c9ecc01" | jq '.data.address'
```
- [x] Returns "119 Magnolia Ln"

### 4.3 POST /feedback (no auth)
```bash
curl -s -X POST "https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1/locations/5755eb1f-403b-4c7d-a154-7eed0c9ecc01/feedback" \
  -H "Content-Type: application/json" \
  -d '{"type": "like"}'
```
- [x] Returns 401 Unauthorized

### 4.4 GET /feedback/status (no auth)
```bash
curl -s "https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1/locations/5755eb1f-403b-4c7d-a154-7eed0c9ecc01/feedback/status"
```
- [x] Returns 401 Unauthorized

### 4.5 POST /report (no auth)
```bash
curl -s -X POST "https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1/locations/5755eb1f-403b-4c7d-a154-7eed0c9ecc01/report" \
  -H "Content-Type: application/json" \
  -d '{"reason": "test"}'
```
- [x] Returns 401 Unauthorized

---

## 5. Security & Rate Limiting

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 5.1 | CORS blocks bad origin | Call API from different domain | Request blocked | [ ] |
| 5.2 | Rate limit works | Make 200+ rapid requests | Eventually returns 429 Too Many Requests | [ ] |
| 5.3 | Auth required | POST to /feedback without token | Returns 401 | [ ] |

---

## 6. Data Integrity

| # | Test | Steps | Expected | Pass |
|---|------|-------|----------|------|
| 6.1 | Like persists | Like a location, refresh page | Like count still shows increased, button shows "Unlike" | [ ] |
| 6.2 | Unlike decrements | Like then unlike same location | Count returns to original value | [ ] |
| 6.3 | No duplicate likes | Rapidly click Like in multiple tabs | Only one like created per user | [ ] |
| 6.4 | Rating updates | Submit star rating, check location | averageRating recalculated | [ ] |
| 6.5 | Report count | Report location, check in DB | reportCount incremented | [ ] |

---

## Test Summary

| Section | Total | Passed | Failed |
|---------|-------|--------|--------|
| 1. Map & Locations | 11 | | |
| 2. Location Detail | 11 | | |
| 3. Authentication | 6 | | |
| 4. API Endpoints | 5 | | |
| 5. Security | 3 | | |
| 6. Data Integrity | 5 | | |
| **TOTAL** | **41** | | |

---

## Notes

_Add any issues or observations here:_

- 

---

## Test History

| Date | Tester | Version | Result |
|------|--------|---------|--------|
| | | | |
