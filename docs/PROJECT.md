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

## Current Status (December 6, 2025)

### ✅ Complete & Working

| Feature | Frontend | Backend | Notes |
|---------|----------|---------|-------|
| Interactive map | ✅ | ✅ | 147+ locations, Leaflet |
| Location popups | ✅ | ✅ | Address, rating, directions, photo preview |
| "Near Me" geolocation | ✅ | - | Browser geolocation |
| Location detail page | ✅ | ✅ | Full details, Get Directions, photo gallery |
| User authentication | ✅ | ✅ | Cognito login/signup |
| Login redirect | ✅ | - | Returns to previous page |
| Submit location suggestion | ✅ | ✅ | With address autocomplete |
| Address autocomplete | ✅ | ✅ | Nominatim geocoding |
| Admin dashboard | ✅ | ✅ | View/approve/reject suggestions |
| Route planner | ✅ | - | Up to 15 stops, optimize |
| Route visualization | ✅ | - | Numbered markers + polyline |
| PDF route generation | ✅ | ✅ | ReportLab with page decorations, QR codes |
| Mobile responsive | ✅ | - | Layout adapts |
| Like/unlike locations | ✅ | ✅ | Optimistic UI updates |
| Report inactive | ✅ | ✅ | Flag displays for review |

### ✅ Photo Features (Complete End-to-End)

| Feature | Frontend | Backend | Notes |
|---------|----------|---------|-------|
| Photo uploads | ✅ | ✅ | Up to 3 photos, 20MB max, HEIC support |
| iPhone compatibility | ✅ | ✅ | Enhanced validation, HEIC/HEIF support |
| Automatic compression | - | ✅ | Compress to ~2MB, 2000px max dimension |
| Photo moderation | ✅ | ✅ | Admin review with lightbox |
| AI photo analysis | - | ✅ | Bedrock Claude detects decorations, quality |
| Photo gallery | ✅ | - | Carousel with thumbnails on detail pages |
| Full-screen lightbox | ✅ | - | Keyboard navigation, click outside to close |
| Photo count badges | ✅ | - | Shows "📸 3" on map popups |

### 📋 Future Enhancements

| Feature | Notes |
|---------|-------|
| User profiles | Saved favorites, submission history |
| Geographic expansion | Houston, Austin, San Antonio |
| Native mobile apps | React Native or native iOS/Android |
| Photo reporting | Flag inappropriate photos |
| Social sharing | Share locations on social media |

---

## Next Priority: User Profiles & Favorites

Photo features are now complete end-to-end! Next focus areas:

### Option 1: User Profiles
Allow users to save their favorite locations and view submission history:
- **Saved favorites** - Heart icon to save locations to profile
- **Submission history** - View status of user's submitted locations
- **Profile page** - Display user info, stats, activity
- **Email notifications** - Alert when submission is approved/rejected

### Option 2: Geographic Expansion
Expand beyond DFW to other Texas cities:
- **Houston area** - Import Houston Christmas light locations
- **Austin area** - Add Austin/Round Rock displays
- **San Antonio** - Include San Antonio locations
- **Multi-region support** - Region selector in navigation
- **Separate map views** - Per-region or combined view

### Option 3: Performance Optimization
Improve app performance for better UX:
- **Lazy loading** - Load photos and location data on-demand
- **API caching** - Cache location data in browser
- **Image optimization** - WebP format, responsive images
- **Map clustering** - Group nearby markers at low zoom
- **Bundle optimization** - Code splitting, tree shaking

---

## Photo Features - Implementation Complete ✅

### Full Photo Pipeline
```
User uploads (iPhone) → Frontend validation (HEIC support)
                     → S3 presigned upload (up to 20MB)
                     → Lambda compression (~2MB, 2000px)
                     → AI analysis (Bedrock Claude)
                     → Admin moderation (approve/reject)
                     → Public display (carousel + lightbox)
```

### Components
- **SubmitLocationPage** - Upload up to 3 photos with enhanced iPhone support
- **AdminPage** - Moderate photos with thumbnail grid and lightbox
- **LocationDetailPage** - Photo carousel with prev/next navigation
- **LocationPopup** - Photo preview with count badge
- **Lightbox** - Full-screen viewer with keyboard navigation

### Backend
- **get_upload_url.py** - Generate presigned S3 URLs (20MB max)
- **analyze_photo.py** - Compress photos and run AI analysis
- **approve_suggestion.py** - Move photos to approved folder
- **reject_suggestion.py** - Delete photos from pending

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

- **Dec 6, 2025:** Photo features complete! Added full photo gallery with carousel + lightbox, automatic compression (20MB→2MB), enhanced iPhone HEIC support
- **Dec 5, 2025 (PM):** Enhanced PDF with ReportLab best practices - custom page template with corner ornaments, page numbers, alternating row colors, gradient-style stats box
- **Dec 5, 2025 (AM):** Documentation consolidated. Reverted WeasyPrint (requires native libs not in Lambda). Next priority: wire up feedback UI
- **Dec 4, 2025:** Route planner + PDF generation complete with QR codes
- **Dec 3, 2025:** Fixed like/unlike toggle, added feedback status endpoint
- **Dec 2, 2025:** MVP complete - map, locations, auth working

---

## Roadmap

### Phase 1: MVP ✅ Complete
- [x] Infrastructure (CDK)
- [x] Map with 147 locations
- [x] Authentication
- [x] Location suggestions
- [x] Admin dashboard
- [x] Route planner + PDF

### Phase 2: Community Features ✅ Complete
- [x] Like/unlike UI with optimistic updates
- [x] Report inactive displays
- [x] Photo uploads (up to 3 photos, 20MB max)
- [x] iPhone photo support (HEIC/HEIF)
- [x] Automatic photo compression (→2MB)
- [x] Photo moderation (admin)
- [x] AI photo analysis (Bedrock Claude)
- [x] Photo gallery with carousel
- [x] Full-screen lightbox viewer

### Phase 3: Growth (Current)
- [ ] User profiles & favorites
- [ ] Geographic expansion (Houston, Austin, San Antonio)
- [ ] Performance optimization (caching, lazy loading)
- [ ] Photo reporting/flagging
- [ ] Social sharing features

### Phase 4: Mobile (Future)
- [ ] Native mobile apps (iOS/Android)
- [ ] Push notifications
- [ ] Offline support
