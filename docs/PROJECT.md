# DFW Christmas Lights Finder - Project Guide

**Last Updated:** December 11, 2025

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

## Current Status (December 11, 2025)

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
| Admin edit entries | ✅ | ✅ | Edit descriptions, tags, quality before approval |
| Route planner | ✅ | - | Up to 20 stops, optimize with 2-opt |
| Route visualization | ✅ | - | Numbered markers + polyline |
| PDF route generation | ✅ | ✅ | ReportLab with page decorations, QR codes |
| Community routes | ✅ | ✅ | Save, share, like, browse routes |
| Mobile responsive | ✅ | - | Layout adapts |
| Like/unlike locations | ✅ | ✅ | Optimistic UI updates |
| Report inactive | ✅ | ✅ | Flag displays for review |
| User profiles | ✅ | ✅ | Profile page with stats, submission history |
| Search & filter | ✅ | - | Search by address/description, filter by category/quality |
| "My Favorites" filter | ✅ | ✅ | Toggle to show only saved locations on map |
| Leaderboards | ✅ | ✅ | Contributors, Most Loved locations, Top Routes tabs |
| Submitter attribution | ✅ | ✅ | "Submitted by [avatar] username" on popups/details |

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

### ✅ User Profile Features (MVP Complete)

| Feature | Frontend | Backend | Notes |
|---------|----------|---------|-------|
| Profile page | ✅ | ✅ | Email, join date, admin badge |
| AI-generated usernames | ✅ | ✅ | Christmas-themed usernames via Bedrock AI |
| Editable usernames | ✅ | ✅ | Users can customize their display name |
| Activity statistics | ✅ | ✅ | Total, approved, pending, rejected counts |
| Submission history | ✅ | ✅ | Expandable cards with details |
| Photo thumbnails | ✅ | ✅ | Display photos in submission history |
| Rejection reasons | ✅ | ✅ | Show admin notes for rejected submissions |
| Status badges | ✅ | - | Color-coded: green/approved, gold/pending, red/rejected |
| Protected routes | ✅ | ✅ | Authentication required for /profile |
| Navigation link | ✅ | - | Profile link in nav (authenticated users only) |
| Contributor badges | ✅ | - | First Light, Scout, Enthusiast, Expert badges |

### ✅ Community Routes (Complete)

| Feature | Frontend | Backend | Notes |
|---------|----------|---------|-------|
| Save routes | ✅ | ✅ | Save planned routes with title, description, tags |
| Browse routes | ✅ | ✅ | `/routes` page with popular/new sorting |
| Route details | ✅ | ✅ | Full route view with map, stops, stats |
| Like routes | ✅ | ✅ | Toggle like with optimistic UI |
| Save to collection | ✅ | ✅ | Bookmark routes for later |
| My Routes | ✅ | ✅ | View created routes on profile |
| Saved Routes | ✅ | ✅ | View bookmarked routes on profile |
| Route stats | ✅ | ✅ | Stop count, estimated time, total miles |
| Routes leaderboard | ✅ | ✅ | Top routes + top route creators |
| Creator badges | ✅ | ✅ | Route Scout, Trail Blazer, Route Master, Legend |
| Public/Draft | ✅ | ✅ | Routes can be public or private drafts |
| Edit/Delete | ✅ | ✅ | Owners can modify their routes |

### 📋 Future Enhancements

| Feature | Notes |
|---------|-------|
| Geographic expansion | Houston, Austin, San Antonio |
| Native mobile apps | React Native or native iOS/Android |
| Photo reporting | Flag inappropriate photos |
| Social sharing | Share locations on social media |
| Email notifications | Alert users when submissions are approved/rejected |

---

## Next Priority: Favorites & Enhancements

User Profiles MVP is now complete! Next focus areas:

### Option 1: Saved Favorites ✅ COMPLETE
Complete the user profiles feature with favorites functionality:
- ✅ **Save/unsave favorites** - Bookmark icon on location popups
- ✅ **Favorites list** - Display saved locations on profile page (default tab)
- ✅ **Backend** - Uses feedback table with type='favorite'
- ✅ **Quick access** - "My Favorites" filter on map
- 🔲 **Email notifications** - Alert when submission is approved/rejected (future)

### Option 2: Geographic Expansion
Expand beyond DFW to other Texas cities:
- **Houston area** - Import Houston Christmas light locations
- **Austin area** - Add Austin/Round Rock displays
- **San Antonio** - Include San Antonio locations
- **Multi-region support** - Region selector in navigation
- **Separate map views** - Per-region or combined view

### Option 3: Performance Optimization ✅ COMPLETE
Improve app performance for better UX:
- ✅ **Code splitting** - Lazy load pages (reduced initial bundle from 599KB to ~50KB)
- ✅ **Vendor chunking** - Separate chunks for react, leaflet, cognito, utils
- ✅ **API caching** - React Query with 10-minute stale time for locations
- ✅ **Map clustering** - Group nearby markers at low zoom (leaflet.markercluster)
- ✅ **Image lazy loading** - Native `loading="lazy"` on images
- 🔲 **WebP format** - Future: convert images to WebP on upload

**Bundle Analysis (After Optimization):**
```
vendor-react:    163KB (53KB gzip) - rarely changes
vendor-map:      155KB (45KB gzip) - rarely changes
vendor-cognito:   91KB (27KB gzip) - rarely changes
vendor-utils:     36KB (15KB gzip) - rarely changes
index (core):     51KB (16KB gzip) - main app
HomePage:         58KB (17KB gzip) - loaded on demand
Other pages:    7-21KB each        - loaded on demand
```

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
├── locations/       # get_locations, get_location_by_id, suggest_addresses, update_location, delete_location, create_location
├── feedback/        # submit_feedback, get_feedback_status, report_inactive, toggle_favorite, get_favorites
├── suggestions/     # submit_suggestion, get_suggestions, approve_suggestion, reject_suggestion, update_suggestion
├── routes/          # generate_pdf, create_route, get_routes, get_route_by_id, update_route, delete_route, route_feedback, get_route_feedback_status, get_user_routes, get_user_saved_routes, get_routes_leaderboard
├── photos/          # get_upload_url, analyze_photo
├── users/           # get_profile, get_submissions, update_profile, get_leaderboard, get_locations_leaderboard
└── auth/            # post_authentication (AI username generation)
```

---

## API Quick Reference

### Public
- `GET /v1/locations` - List all locations
- `GET /v1/locations/{id}` - Get location details
- `POST /v1/locations/suggest-addresses` - Geocode address
- `GET /v1/leaderboard` - Public contributor rankings
- `GET /v1/leaderboard/locations` - Top locations by likes
- `GET /v1/leaderboard/routes` - Top routes + route creators
- `GET /v1/routes` - Browse public routes (sort: popular/new)
- `GET /v1/routes/{id}` - Get route details with locations

### Authenticated
- `POST /v1/suggestions` - Submit location suggestion
- `POST /v1/locations/{id}/feedback` - Like location
- `GET /v1/locations/{id}/feedback/status` - Get user's feedback status (like, report, favorite)
- `POST /v1/locations/{id}/report` - Report inactive
- `POST /v1/locations/{id}/favorite` - Toggle favorite
- `GET /v1/users/profile` - Get user profile with stats
- `PUT /v1/users/profile` - Update user profile (username)
- `GET /v1/users/submissions` - Get user's submission history
- `GET /v1/users/favorites` - Get user's saved favorites
- `GET /v1/users/routes` - Get user's created routes
- `GET /v1/users/saved-routes` - Get user's saved routes
- `POST /v1/routes` - Create a new route
- `PUT /v1/routes/{id}` - Update route (owner only)
- `DELETE /v1/routes/{id}` - Delete route (owner only)
- `POST /v1/routes/{id}/feedback` - Like/save route
- `GET /v1/routes/{id}/feedback/status` - Get user's route feedback status
- `POST /v1/routes/generate-pdf` - Generate PDF route guide

### Admin Only
- `GET /v1/suggestions` - List pending suggestions
- `PUT /v1/suggestions/{id}` - Update suggestion (description, tags, quality)
- `POST /v1/suggestions/{id}/approve` - Approve → creates location
- `POST /v1/suggestions/{id}/reject` - Reject suggestion
- `PUT /v1/locations/{id}` - Update location (description, tags, quality, status)
- `DELETE /v1/locations/{id}` - Delete location (for testing)

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

- **Dec 11, 2025:** Added Community Routes feature - users can save routes from route planner, browse public routes, like/save routes, view on profile. New leaderboard tab for top routes and route creators. Route creator badges: Route Scout (1), Trail Blazer (3), Route Master (5), Legend (10+).
- **Dec 10, 2025 (Late PM):** Rewrote import script to extract coordinates from Google Maps URLs. Entries without coords go to suggestions table for admin review. Added `source` field to track data origin. Admin page now shows Google Maps link for suggestions.
- **Dec 10, 2025 (PM):** Added Leaderboards with tabs (Contributors + Most Loved locations). Added "Submitted by [avatar] username" attribution on location popups and detail pages. New endpoint: GET /leaderboard/locations.
- **Dec 10, 2025:** Added AI-generated Christmas-themed usernames using Bedrock Claude (e.g., "JollyReindeerRider", "TwinklingStarCollector"). Users can edit their username on the profile page.
- **Dec 9, 2025:** Added admin edit functionality for locations and suggestions - can now edit descriptions, AI descriptions, categories, themes, and display quality before approval. Fixed route panel to stay minimized when adding stops.
- **Dec 9, 2025:** Enhanced AI photo analysis - now triggers on suggestion submit (not just photo upload), ensuring all photos get analyzed regardless of upload order.
- **Dec 8, 2025 (PM):** Fixed mobile popup closing issue - disabled autoPan, added manual pan after popup opens
- **Dec 8, 2025:** Added contributor badges system (First Light, Scout, Enthusiast, Expert) with progress tracking on profile page
- **Dec 7, 2025:** Fixed map popups to show full LocationPopup component with photos, descriptions, tags, and action buttons instead of just address
- **Dec 6, 2025 (PM):** User Profiles MVP complete! Added profile page with email, join date, activity stats (total/approved/pending/rejected), submission history with expandable cards, photo thumbnails, rejection reasons, and status badges
- **Dec 6, 2025 (AM):** Photo features complete! Added full photo gallery with carousel + lightbox, automatic compression (20MB→2MB), enhanced iPhone HEIC support
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
- [x] User profiles (MVP) - Profile page, activity stats, submission history
- [x] Saved favorites - Bookmark icon, favorites list on profile
- [x] Performance optimization - Code splitting, caching, map clustering
- [x] "My Favorites" map filter - Toggle to show only saved locations
- [x] Search and filter - Search by address/description, filter by category/quality
- [x] AI-generated usernames - Christmas-themed usernames via Bedrock Claude
- [x] Admin edit entries - Edit descriptions, tags, quality before approval
- [x] Community routes - Save, share, browse, like routes with leaderboard
- [ ] Geographic expansion (Houston, Austin, San Antonio)
- [ ] Photo reporting/flagging
- [ ] Social sharing features
- [ ] Email notifications for submissions

### Phase 4: Mobile (Future)
- [ ] Native mobile apps (iOS/Android)
- [ ] Push notifications
- [ ] Offline support

---

## Future Vision

Long-term growth strategies for scaling the platform.

### Community-Driven Growth
- **Gamification**: Contributor badges (✅ done), leaderboards, achievement scores
- **Recognition**: "Submitted by" attribution, contributor spotlight, public profiles
- **Engagement**: Email notifications, weekly digests, badge progress alerts

### AI-Powered Discovery (Future)
Automated location discovery using AWS services:
- News article scraping → Bedrock Claude extraction → geocoding → admin review
- Social media monitoring (Facebook groups, Reddit, Instagram geotags)
- Auto-approval agent for high-confidence submissions

### Geographic Expansion
- Houston, Austin, San Antonio regions
- Multi-region selector in navigation
- Per-region or combined map views
- See `docs/GEOGRAPHIC_EXPANSION_PLAN.md` for details

### Admin Automation (Bedrock Agents)
- Auto-review submissions (photo validation, duplicate detection)
- Location cleanup (description enhancement, tag standardization)
- Quality scoring and confidence thresholds

_For detailed strategy docs, see `docs/FUTURES.md` (archived reference)._
