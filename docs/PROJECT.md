# DFW Christmas Lights Finder - Project Guide

**Last Updated:** December 3, 2025

> Start here when resuming work. This doc consolidates status, next steps, and future ideas.

---

## Quick Start

```bash
# Frontend (terminal 1)
cd frontend && npm run dev

# Deploy infrastructure changes
cd infrastructure && uv run cdk deploy

# Run import scripts
cd scripts && uv run python import_locations.py --help
```

**Test credentials:** `testuser@example.com` / `TestPass123!`

**Live URLs:**
- Frontend: http://localhost:5173 (dev) | https://d173b693cir3zc.cloudfront.net (deployed)
- API: https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1

---

## Current Status

### ✅ Complete
- **Infrastructure:** CDK deployed (DynamoDB, Lambda, API Gateway, Cognito, S3, CloudFront)
- **Data:** 146 locations imported and geocoded
- **Map:** Leaflet with markers, popups, "Near Me" geolocation
- **Auth:** Cognito login/signup working
- **Feedback:** Like, star rating, report endpoints
- **Security:** CORS restricted, rate limiting (100 req/sec)

### 🔧 In Progress
- Auth flow fixes (this branch: `fix/remove-demo-mode-notice`)

### ⏳ Next Up
1. Complete auth testing
2. Admin dashboard
3. Submit location suggestions

---

## Architecture Overview

```
Frontend (React)  →  API Gateway  →  Lambda  →  DynamoDB
     ↓                    ↓
  Cognito            CloudFront → S3 (static files)
```

**Key Tables:**
- `christmas-lights-locations-dev` - 146 locations with GSIs
- `christmas-lights-feedback-dev` - Likes, ratings
- `christmas-lights-suggestions-dev` - User submissions

**Key Endpoints:**
- `GET /v1/locations` - List all (public)
- `GET /v1/locations/{id}` - Single location (public)
- `POST /v1/locations/{id}/feedback` - Like/rate (auth required)
- `POST /v1/locations/{id}/report` - Report inactive (auth required)

---

## Future Ideas / Backlog

### User Profiles (`/users/me` endpoint)
**Why:** Currently user info comes from Cognito token. A dedicated endpoint would enable:
- Saved favorite locations
- Route history
- Contribution stats (likes given, locations suggested)
- User preferences

**Implementation:**
1. Create `users` DynamoDB table
2. Create `/users/me` GET/PUT Lambda
3. Update AuthContext to fetch profile

### Route Planning
- Traveling salesman optimization
- Export to Google Maps (10 waypoint limit)
- Shareable route links

### Photo Uploads
- S3 presigned URLs
- Image optimization Lambda
- Moderation queue

### Proximity Search
- Geohashing for efficient "near me" queries
- Currently shows all locations, filters client-side

### Admin Dashboard
- Approve/reject location suggestions
- Review flagged locations (3+ reports)
- Bulk location management

### Mobile Apps
- React Native or native iOS/Android
- Offline support
- Push notifications for new nearby locations

---

## Testing

See `docs/TEST_PLAN.md` for full checklist.

**Quick smoke test:**
1. Load map → markers appear
2. Click marker → popup shows real address
3. Login → can like locations
4. Location detail page → shows real data

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
    ├── PROJECT.md     # ← YOU ARE HERE (start here!)
    ├── ARCHITECTURE.md # Detailed system design
    ├── API.md          # API endpoint specs
    └── TEST_PLAN.md    # Testing checklist
```

---

## Common Commands

```bash
# Git
git checkout -b feature/my-feature
git add -A && git commit -m "feat: description"
gh pr create --base main --title "Title"

# Deploy
cd infrastructure && uv run cdk deploy

# Check logs
aws logs tail "/aws/lambda/ChristmasLightsStack-dev-GetLocationsFunctionB2F3B-xxx" --since 5m

# Test API
curl -s "https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1/locations?pageSize=3" | jq
```

---

## Notes

_Add session notes, blockers, or decisions here:_

- **Dec 3, 2025:** Fixed auth to use Cognito token instead of missing `/users/me` endpoint
- **Dec 2, 2025:** MVP complete - map, locations, feedback all working

---

## Reference Docs

- `ARCHITECTURE.md` - Database schema, security, monitoring details
- `API.md` - Full endpoint specifications
- `GOOGLE_MAPS_EXPORT_GUIDE.md` - How to export locations from Google Maps
- `TEST_PLAN.md` - Manual testing checklist
