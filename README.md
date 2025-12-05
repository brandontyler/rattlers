# 🎄 DFW Christmas Lights Finder

A community-driven web application helping families in the Dallas-Fort Worth area discover and navigate the best Christmas light displays.

## Features

### Current Features
- 🗺️ Interactive map displaying 147+ Christmas light locations
- 📍 Address autocomplete with geocoding (Nominatim/OpenStreetMap)
- 🔐 User authentication (Cognito)
- 📝 Submit new location suggestions
- ✅ Admin dashboard for reviewing/approving suggestions
- 🧭 Get Directions integration with Google Maps
- 📱 Mobile-responsive design
- 🔄 Login redirect (returns to previous page after login)
- 🚗 **Route Planner** - Build custom routes with up to 15 stops
- 📄 **PDF Generation** - Festive printable route guide with map and QR codes

### Completed
- ❤️ Like system - users can like their favorite displays
- 🚫 Report inactive displays - flag displays that are no longer active

### Future Phases
- 📸 User-submitted photos (with moderation)
- 📱 Native mobile apps (iOS/Android)
- 🌎 Geographic expansion (Houston, Austin)

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS
- Leaflet (mapping library)
- React Router v6
- Axios (API client)

### Backend
- Python 3.12
- AWS Lambda (serverless functions)
- API Gateway (REST API)
- DynamoDB (NoSQL database)
- Cognito (authentication)
- S3 (image storage - future)

### Infrastructure
- AWS CDK (Infrastructure as Code)
- CloudFront (CDN)
- Route 53 (DNS - for custom domain)
- GitHub Actions (CI/CD)

## Project Structure

```
.
├── frontend/           # React TypeScript application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Page components
│   │   ├── services/   # API service layer
│   │   ├── contexts/   # React contexts (Auth)
│   │   └── types/      # TypeScript types
│   └── package.json
├── backend/            # Python Lambda functions
│   ├── functions/
│   │   ├── locations/  # Location CRUD + geocoding
│   │   ├── feedback/   # Likes, ratings, reports
│   │   ├── suggestions/# Suggestion submission + admin
│   │   └── routes/     # Route PDF generation
│   └── layers/
│       └── common/     # Shared utilities (db, responses)
├── infrastructure/     # AWS CDK (Python)
│   ├── app.py
│   └── stacks/
│       └── main_stack.py
├── docs/              # Documentation
└── scripts/           # Utility scripts
```

## API Endpoints

### Public
- `GET /v1/locations` - List all locations
- `GET /v1/locations/{id}` - Get location details
- `POST /v1/locations/suggest-addresses` - Geocode address query

### Authenticated
- `POST /v1/suggestions` - Submit new location suggestion
- `POST /v1/locations/{id}/feedback` - Like/unlike location
- `GET /v1/locations/{id}/feedback/status` - Get user's like status
- `POST /v1/locations/{id}/report` - Report inactive location

### Admin Only
- `GET /v1/suggestions` - List pending suggestions
- `POST /v1/suggestions/{id}/approve` - Approve suggestion (creates location)
- `POST /v1/suggestions/{id}/reject` - Reject suggestion

### Routes
- `POST /v1/routes/generate-pdf` - Generate PDF route guide with map and QR codes

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.12+
- [uv](https://github.com/astral-sh/uv) (Python package manager)
- AWS CLI configured
- AWS CDK installed (`npm install -g aws-cdk`)

### Local Development

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Backend (Local Testing)
```bash
cd backend
uv sync
uv run pytest
```

#### Infrastructure Deployment
```bash
cd infrastructure
uv sync
uv run cdk bootstrap  # First time only
uv run cdk deploy
```

## Environment Variables

### Frontend `.env`
```
VITE_API_ENDPOINT=https://your-api-gateway-url/dev/v1
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxx
VITE_COGNITO_CLIENT_ID=your-client-id
VITE_AWS_REGION=us-east-1
```

### Backend
Environment variables are managed through CDK and injected into Lambda functions:
- `LOCATIONS_TABLE_NAME`
- `SUGGESTIONS_TABLE_NAME`
- `FEEDBACK_TABLE_NAME`
- `ALLOWED_ORIGIN`

## Development Workflow

1. Create feature branch from `main`
2. Make changes and test locally
3. Run tests: `npm run build` (frontend) or `pytest` (backend)
4. Commit with descriptive message
5. Push and create pull request
6. GitHub Actions deploys to dev on merge to main

## Admin Access

Admin users are managed via Cognito groups:
1. Add user to `Admins` group in Cognito console
2. User must log out and back in to get updated token
3. Admin link appears in navigation
4. Access `/admin` to review suggestions

## Roadmap

- [x] Project planning and architecture
- [x] MVP development
  - [x] Infrastructure setup (CDK deployed)
  - [x] Frontend with map integration (Leaflet)
  - [x] Backend API endpoints (Lambda)
  - [x] Authentication (Cognito)
  - [x] 147 locations imported and geocoded
- [x] Community features
  - [x] Location suggestion submission
  - [x] Address autocomplete with geocoding
  - [x] Likes UI (fully implemented)
  - [x] Report inactive displays (fully implemented)
  - [ ] Photo uploads UI (backend ready)
- [x] Admin dashboard
  - [x] View pending suggestions
  - [x] Approve suggestions (creates location)
  - [x] Reject suggestions
  - [x] Dynamic location count
- [x] Route Planner
  - [x] Add/remove locations to route (up to 15 stops)
  - [x] Reorder stops manually
  - [x] Optimize route (nearest neighbor algorithm)
  - [x] Route visualization on map (numbered markers + polyline)
  - [x] PDF generation with festive design
  - [x] Static map image in PDF
  - [x] QR codes for Google Maps navigation
- [ ] Photo uploads UI (backend ready)
  - [ ] File picker with image preview
  - [ ] Upload to S3 using presigned URLs
  - [ ] Photo moderation (admin review queue)
- [ ] Mobile apps (Future)

## Cost Estimates

- **Low traffic** (< 1,000 users/month): $10-30/month
- **Medium traffic** (10,000 users/month): $50-150/month
- **High traffic** (100,000 users/month): $300-800/month

AWS Free Tier covers most costs initially.

## License

TBD

---

**Made with ❤️ for the DFW community**
