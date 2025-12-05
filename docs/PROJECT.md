# DFW Christmas Lights Finder - Project Guide

**Last Updated:** December 5, 2025

> Start here when resuming work. This is the single source of truth for project status.

---

## Quick Start

```bash
# Frontend (terminal 1)
cd frontend && npm run dev

# Deploy infrastructure changes
cd infrastructure && uv run cdk deploy

# Run backend tests
cd backend && uv run pytest
```

**Test credentials:** `testuser@example.com` / `TestPass123!`

**Live URLs:**
- Frontend: http://localhost:5173 (dev) | https://d173b693cir3zc.cloudfront.net (deployed)
- API: https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1

---

## Current Status (December 5, 2025)

### ✅ Complete & Working

| Feature | Frontend | Backend | Notes |
|---------|----------|---------|-------|
| Interactive map | ✅ | ✅ | 147+ locations, Leaflet |
| Location popups | ✅ | ✅ | Address, rating, directions |
| "Near Me" geolocation | ✅ | - | Browser geolocation |
| Location detail page | ✅ | ✅ | Full details, Get Directions |
| User authentication | ✅ | ✅ | Cognito login/signup |
| Login redirect | ✅ | - | Returns to previous page |
| Submit location suggestion | ✅ | ✅ | With address autocomplete |
| Address autocomplete | ✅ | ✅ | Nominatim geocoding |
| Admin dashboard | ✅ | ✅ | View/approve/reject suggestions |
| Route planner | ✅ | - | Up to 15 stops, optimize |
| Route visualization | ✅ | - | Numbered markers + polyline |
| PDF route generation | ✅ | ✅ | ReportLab with page decorations, QR codes |
| Mobile responsive | ✅ | - | Layout adapts |

### ✅ Implemented Features

| Feature | Frontend | Backend | Notes |
|---------|----------|---------|-------|
| Like/unlike locations | ✅ | ✅ | Fully implemented |
| Report inactive | ✅ | ✅ | Fully implemented |
| Photo uploads (suggestions) | ✅ | ✅ | Presigned S3 URLs, upload progress, 3 photo max |
| Photo moderation (admin) | ✅ | ✅ | Review in admin dashboard, approve/reject with lightbox |

### 📋 Not Started

| Feature | Notes |
|---------|-------|
| Photo gallery (detail page) | Display approved photos in carousel/lightbox on public pages |
| User profiles | Saved favorites, history |
| Geographic expansion | Houston, Austin, etc. |
| Native mobile apps | React Native or native |

---

## Next Priority: Photo Gallery on Location Detail Pages

Photo uploads AND moderation are fully implemented. Next step is displaying them publicly:

### What Exists ✅
- **Photo upload** - Users upload up to 3 photos with suggestions (JPEG/PNG/WebP/HEIC, 5MB max)
- **Upload progress** - Real-time feedback during upload
- **Photo moderation** - Admins review photos in AdminPage with thumbnails + lightbox
- **Automated photo handling** - On approval, photos move from `pending/{suggestionId}/` to `approved/{locationId}/`
- **CDN support** - CloudFront URL generation for approved photos
- **S3 cleanup** - Rejected suggestions delete photos from S3

### What's Needed ← Next Priority

1. **Photo gallery on LocationDetailPage**
   - Display approved photos from `location.photos[]` array
   - Image carousel or grid layout
   - Lightbox for full-size viewing
   - Lazy loading for performance
   - Mobile-responsive design

2. **Photo thumbnails on map popups** (optional)
   - Show first photo thumbnail in LocationPopup
   - Click to view detail page

3. **Photo reporting** (future)
   - Allow users to flag inappropriate photos
   - Admin queue for reported content

### Technical Implementation
**Backend Flow (Complete):**
```
User uploads → pending/{suggestionId}/{photoId}.ext
Admin approves → Copy to approved/{locationId}/{photoId}.ext
                 Delete from pending/
                 Add CDN URL to location.photos[]
Admin rejects → Delete photos from pending/
```

**Frontend (Remaining):**
- Add photo carousel/grid to `LocationDetailPage.tsx`
- Use lightbox component (already exists in AdminPage)
- Handle empty photo arrays gracefully

---

## Architecture Overview

```
Frontend (React)  →  API Gateway  →  Lambda  →  DynamoDB
     ↓                    ↓
  Cognito            CloudFront → S3 (static files)
```

**Key Tables:**
- `christmas-lights-locations-dev` - 147 locations
- `christmas-lights-feedback-dev` - Likes, ratings, reports
- `christmas-lights-suggestions-dev` - User submissions

**Backend Functions:**
```
backend/functions/
├── locations/       # get_locations, get_location_by_id, suggest_addresses
├── feedback/        # submit_feedback, get_feedback_status, report_inactive
├── suggestions/     # submit, get, approve, reject
├── routes/          # generate_pdf
└── photos/          # get_upload_url
```

---

## API Quick Reference

### Public
- `GET /v1/locations` - List all locations
- `GET /v1/locations/{id}` - Get location details
- `POST /v1/locations/suggest-addresses` - Geocode address

### Authenticated
- `POST /v1/suggestions` - Submit location suggestion
- `POST /v1/locations/{id}/feedback` - Like location
- `GET /v1/locations/{id}/feedback/status` - Get user's like status
- `POST /v1/locations/{id}/report` - Report inactive

### Admin Only
- `GET /v1/suggestions` - List pending suggestions
- `POST /v1/suggestions/{id}/approve` - Approve → creates location
- `POST /v1/suggestions/{id}/reject` - Reject suggestion

### Routes
- `POST /v1/routes/generate-pdf` - Generate PDF route guide

Full API docs: `docs/API.md`

---

## Common Commands

```bash
# Git workflow
git checkout -b feature/my-feature
git add -A && git commit -m "feat: description"
gh pr create --base main --title "Title"

# Deploy
cd infrastructure && uv run cdk deploy

# Check diff before deploy
cd infrastructure && uv run cdk diff

# View Lambda logs
aws logs tail "/aws/lambda/ChristmasLightsStack-dev-GetLocationsFunctionB2F3B-xxx" --since 5m

# Test API
curl -s "https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1/locations?pageSize=3" | jq
```

---

## File Structure

```
├── frontend/          # React + TypeScript + Vite
├── backend/
│   ├── functions/     # Lambda handlers
│   └── layers/        # Shared code (db, auth, responses)
├── infrastructure/    # AWS CDK (Python)
├── scripts/           # Import tools
└── docs/
    ├── PROJECT.md     # ← YOU ARE HERE
    ├── API.md         # API endpoint specs
    ├── ARCHITECTURE.md # System design details
    ├── TEST_PLAN.md   # Testing checklist
    └── GEOGRAPHIC_EXPANSION_PLAN.md # Future multi-region
```

---

## Session Notes

_Add notes, blockers, or decisions here:_

- **Dec 5, 2025 (PM):** Enhanced PDF with ReportLab best practices - custom page template with corner ornaments, page numbers, alternating row colors, gradient-style stats box
- **Dec 5, 2025 (AM):** Documentation consolidated. Reverted WeasyPrint (requires native libs not in Lambda). Next priority: wire up feedback UI
- **Dec 4, 2025:** Route planner + PDF generation complete with QR codes
- **Dec 3, 2025:** Fixed like/unlike toggle, added feedback status endpoint
- **Dec 2, 2025:** MVP complete - map, locations, auth working

---

## Roadmap

### Phase 1: MVP ✅
- [x] Infrastructure (CDK)
- [x] Map with 147 locations
- [x] Authentication
- [x] Location suggestions
- [x] Admin dashboard
- [x] Route planner + PDF

### Phase 2: Community Features (Current)
- [x] **Like/unlike UI** ← Complete
- [x] Report inactive UI ← Complete
- [ ] Photo uploads UI ← Next
- [ ] Photo moderation (admin)

### Phase 3: Growth
- [ ] User profiles
- [ ] Geographic expansion (Houston, Austin)
- [ ] Performance optimization (caching)

### Phase 4: Mobile
- [ ] Native mobile apps
- [ ] Push notifications
