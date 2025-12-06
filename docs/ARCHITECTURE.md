# Architecture Documentation

**Last Updated:** December 6, 2025

## System Overview

DFW Christmas Lights Finder is a serverless web application built entirely on AWS, designed to scale efficiently with variable traffic patterns.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│              Route 53 (DNS)                          │
│         christmaslights.example.com                  │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│           CloudFront (CDN)                           │
│     - Global edge locations                          │
│     - SSL/TLS termination                            │
│     - Caching (static assets & API responses)        │
└─────────────────┬───────────────────────────────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
┌─────────────────┐  ┌──────────────────────────────┐
│   S3 Bucket     │  │    API Gateway (REST)        │
│  (Frontend)     │  │  /api/v1/*                   │
│  - index.html   │  │  - CORS enabled              │
│  - React app    │  │  - Request validation        │
│  - Assets       │  │  - Rate limiting             │
└─────────────────┘  └──────────┬───────────────────┘
                                │
                     ┌──────────┴──────────┐
                     ▼                     ▼
              ┌─────────────┐      ┌─────────────┐
              │  Cognito    │      │  Lambda     │
              │  - Users    │      │  Functions  │
              │  - Auth     │      │  (Python)   │
              └─────────────┘      └──────┬──────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
             ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
             │  DynamoDB   │       │     S3      │       │  Bedrock    │
             │             │       │  (Photos)   │       │  (Claude)   │
             │ - Locations │       │             │       │  AI Photo   │
             │ - Feedback  │       │  S3 Trigger │       │  Analysis   │
             │ - Users     │       │      ↓      │       │             │
             │ - Reports   │       │  Lambda     │───────│             │
             └─────────────┘       └─────────────┘       └─────────────┘
```

## Components

### Frontend (React SPA)

**Technology:**
- React 18 with TypeScript
- Vite for fast builds
- Tailwind CSS for styling
- Leaflet for maps
- React Query for API state management

**Key Pages:**
- `/` - Home with map view
- `/location/:id` - Location details
- `/admin` - Admin dashboard (protected)
- `/login` - Authentication
- `/submit` - Submit new location (protected)

**State Management:**
- React Context for auth state
- React Query for server state
- Local storage for user preferences

### Backend (AWS Lambda)

**Functions:**

1. **GetLocations** (`GET /locations`)
   - Query params: lat, lng, radius, search, filters
   - Returns paginated location list
   - Caching: 5 minutes

2. **GetLocationById** (`GET /locations/{id}`)
   - Returns single location with full details
   - Includes aggregated feedback stats

3. **CreateLocation** (`POST /locations`) - Admin only
   - Creates new location
   - Validates address using geocoding

4. **UpdateLocation** (`PUT /locations/{id}`) - Admin only
   - Updates location details

5. **DeleteLocation** (`DELETE /locations/{id}`) - Admin only
   - Soft delete (sets status to 'inactive')

6. **SubmitLocationSuggestion** (`POST /suggestions`)
   - Requires authentication
   - Creates suggestion for admin review

7. **SubmitFeedback** (`POST /locations/{id}/feedback`)
   - Requires authentication
   - Like: Toggle behavior (creates or removes like)
   - Star: Creates or updates rating
   - Atomic writes prevent duplicate likes from race conditions
   - Updates location aggregate stats (likeCount, averageRating)

8. **GetFeedbackStatus** (`GET /locations/{id}/feedback/status`)
   - Requires authentication
   - Returns user's current feedback status for a location
   - Used to display correct UI state (Like vs Unlike button)

9. **ReportInactive** (`POST /locations/{id}/report`)
   - Requires authentication
   - Increments report count
   - Flags location if threshold reached (3 reports)

10. **GetSuggestions** (`GET /suggestions`) - Admin only
    - Lists pending suggestions
    - Includes AI-detected tags and description

11. **ApproveSuggestion** (`POST /suggestions/{id}/approve`) - Admin only
    - Converts suggestion to location
    - Moves photos from pending/ to approved/

12. **AnalyzePhoto** (S3 Trigger)
    - Triggered on S3 upload to pending/ prefix
    - Compresses photos to ~2MB, 2000px max
    - Calls Bedrock Claude 3.5 Sonnet for AI analysis
    - Detects Christmas decorations (snowman, santa, lights, etc.)
    - Generates description and quality rating
    - Flags non-Christmas photos for review
    - Updates suggestion record with tags

### Database (DynamoDB)

**Tables:**

#### Locations Table
```
PK: location#{uuid}
SK: metadata#

Attributes:
{
  "id": "uuid",
  "address": "string",
  "lat": number,
  "lng": number,
  "description": "string",
  "photos": ["s3-url-1", "s3-url-2"],
  "status": "active|inactive|flagged",
  "feedbackCount": number,
  "averageRating": number,
  "likeCount": number,
  "reportCount": number,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "createdBy": "user-id"
}

GSI-1:
  PK: status#{active|inactive}
  SK: averageRating#
  (For querying active locations sorted by rating)

GSI-2:
  PK: geo#
  SK: lat#lng#
  (For geospatial queries - can use DynamoDB geohashing)
```

#### Feedback Table
```
PK: feedback#{uuid}
SK: location#{location-id}

Attributes:
{
  "id": "uuid",
  "locationId": "uuid",
  "userId": "cognito-sub",
  "type": "like|star",
  "rating": number (1-5, optional),
  "comment": "string" (Phase 3),
  "createdAt": "ISO-8601"
}

GSI-1 (userId-locationId-index):
  PK: userId
  SK: locationId
  (For efficient user feedback lookups - prevents race conditions)

  Purpose:
  - Check if user has already liked/rated a location
  - Query complexity: O(1) instead of O(n) table scan
  - Atomic conditional writes prevent duplicate likes

GSI-2 (location-createdAt-index):
  PK: location#{location-id}
  SK: createdAt#
  (For querying all feedback for a location chronologically)
```

**Race Condition Prevention:**
- Atomic writes with `ConditionExpression` on PK/SK
- GSI enables fast duplicate checking before write
- Idempotent responses for concurrent requests

#### Suggestions Table
```
PK: suggestion#{uuid}
SK: status#{pending|approved|rejected}

Attributes:
{
  "id": "uuid",
  "address": "string",
  "description": "string",
  "photos": ["s3-url"],
  "submittedBy": "user-id",
  "status": "pending|approved|rejected",
  "createdAt": "ISO-8601",
  "reviewedAt": "ISO-8601",
  "reviewedBy": "admin-user-id"
}
```

### Authentication (Cognito)

**User Pool Configuration:**
- Username: Email
- Password policy: Min 8 chars, require uppercase, lowercase, number
- MFA: Optional (can be enabled later)
- Email verification required

**User Attributes:**
- email (required)
- name (optional)
- custom:isAdmin (boolean)

**Groups:**
- `Admins` - Full access to admin endpoints

### Storage (S3)

**Buckets:**

1. **Frontend Bucket** (`{app-name}-frontend-{env}`)
   - Static website hosting
   - Public read access
   - CloudFront origin

2. **Photos Bucket** (`{app-name}-photos-{env}`)
   - User-uploaded photos
   - Private (signed URLs via Lambda)
   - Lifecycle policy: Delete after 1 year (configurable)
   - Image optimization via Lambda trigger

### API Design

**Base URL:** `https://api.christmaslights.example.com/v1`

**Authentication:**
- Bearer token (JWT from Cognito)
- Header: `Authorization: Bearer {token}`

**Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 148
  }
}
```

**Error Format:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Address is required",
    "details": { ... }
  }
}
```

## Security

### Frontend
- Content Security Policy (CSP) via CloudFront
- HTTPS only
- XSS protection via React's built-in escaping
- Input validation on all forms

### Backend
- API Gateway request validation
- Lambda function IAM roles (least privilege)
- Secrets in AWS Secrets Manager
- SQL injection N/A (DynamoDB)
- Rate limiting via API Gateway

### Data
- Encryption at rest (DynamoDB, S3)
- Encryption in transit (TLS 1.2+)
- Signed URLs for private S3 objects
- DynamoDB point-in-time recovery enabled

## Monitoring & Logging

### CloudWatch
- Lambda function logs (retention: 30 days)
- API Gateway access logs
- Custom metrics:
  - Location views
  - Feedback submissions
  - API errors
  - Response times

### Alarms
- Lambda error rate > 5%
- API Gateway 5xx errors
- DynamoDB throttling
- Estimated AWS cost > threshold

### Dashboards
- Real-time traffic metrics
- User engagement (feedback, submissions)
- Cost tracking

## Deployment

### Environments
1. **Dev** - Development and testing
2. **Prod** - Production (Christmas season)

### CI/CD Pipeline
- GitHub Actions (future)
- Manual deployment via CDK for MVP

### Deployment Process
```bash
# Deploy infrastructure (uses uv)
cd infrastructure
uv run cdk deploy --all

# Build and deploy frontend
cd frontend
npm run build
aws s3 sync dist/ s3://frontend-bucket/
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
```

## Scalability Considerations

### Current Limits
- DynamoDB: 40,000 RCU/WCU per table (on-demand)
- Lambda: 1,000 concurrent executions (can increase)
- API Gateway: 10,000 RPS (can increase)

### Future Optimizations
- DynamoDB DAX for read caching
- CloudFront caching for API responses
- Lambda reserved concurrency for critical functions
- S3 Transfer Acceleration for uploads

## Cost Optimization

### Strategies
1. Aggressive CloudFront caching (reduce Lambda invocations)
2. DynamoDB on-demand pricing (pay per request)
3. S3 Intelligent-Tiering for photos
4. Lambda ARM64 (Graviton) for cost savings
5. Lifecycle policies to delete old data

### Monitoring
- AWS Cost Explorer
- Budget alerts at $50, $100, $200 thresholds
- Tag all resources for cost allocation

## Disaster Recovery

### Backup Strategy
- DynamoDB: Point-in-time recovery (PITR) enabled
- S3: Versioning enabled on photos bucket
- Infrastructure: Version controlled via CDK

### Recovery Objectives
- RPO (Recovery Point Objective): 1 hour
- RTO (Recovery Time Objective): 4 hours

### Rollback Plan
- Infrastructure: `uv run cdk rollback`
- Frontend: Revert CloudFront to previous S3 version
- Database: Restore from PITR
