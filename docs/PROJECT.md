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

### ⏳ Backend Done, Frontend Not Wired Up

| Feature | Frontend | Backend | Priority |
|---------|----------|---------|----------|
| Like/unlike locations | ❌ | ✅ | **HIGH** |
| Star ratings | ❌ | ✅ | **HIGH** |
| Report inactive | ❌ | ✅ | Medium |
| Photo upload URL | ❌ | ✅ | Low |

### 📋 Not Started

| Feature | Notes |
|---------|-------|
| Photo uploads UI | S3 presigned URLs ready, need UI |
| Photo moderation | Admin review queue |
| User profiles | Saved favorites, history |
| Geographic expansion | Houston, Austin, etc. |
| Native mobile apps | React Native or native |

---

## Next Priority: Wire Up Feedback UI

The backend for likes/ratings is complete but the frontend doesn't use it yet. This is the highest-impact next step.

### What Exists (Backend)
- `POST /locations/{id}/feedback` - Submit like or rating
- `GET /locations/{id}/feedback/status` - Get user's current feedback
- `POST /locations/{id}/report` - Report inactive location
- DynamoDB table with GSI for efficient queries
- Race condition prevention with atomic writes

### What's Needed (Frontend)
1. **Like button on location popup/detail page**
   - Show filled/unfilled heart based on `feedback/status`
   - Toggle on click, optimistic UI update
   
2. **Star rating on location detail page**
   - 5-star clickable rating
   - Show user's rating if exists
   
3. **Report button on location detail page**
   - "Report as inactive" with confirmation
   - Show if user already reported

### Implementation Notes
- AuthContext already provides user token
- API service has feedback methods (check `api.ts`)
- Location popup already has "Add to Route" button - add Like next to it

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
- `POST /v1/locations/{id}/feedback` - Like/rate location
- `GET /v1/locations/{id}/feedback/status` - Get user's feedback
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
- [ ] **Like/unlike UI** ← Next
- [ ] **Star ratings UI** ← Next
- [ ] Report inactive UI
- [ ] Photo uploads

### Phase 3: Growth
- [ ] User profiles
- [ ] Geographic expansion (Houston, Austin)
- [ ] Performance optimization (caching)

### Phase 4: Mobile
- [ ] Native mobile apps
- [ ] Push notifications
