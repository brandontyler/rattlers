# API Documentation

**Last Updated:** December 11, 2025

Base URL: `https://c48t18xgn5.execute-api.us-east-1.amazonaws.com/dev/v1`

## Authentication

Most endpoints require authentication via Cognito JWT token.

**Header:**
```
Authorization: Bearer {cognito-jwt-token}
```

**Public endpoints** (no auth required):
- `GET /locations`
- `GET /locations/{id}`
- `POST /locations/suggest-addresses`
- `GET /leaderboard`
- `GET /leaderboard/locations`
- `GET /leaderboard/routes`
- `GET /routes`
- `GET /routes/{id}`

**Authenticated endpoints** (require valid JWT):
- `POST /suggestions`
- `POST /locations/{id}/feedback`
- `GET /locations/{id}/feedback/status`
- `POST /locations/{id}/report`
- `POST /locations/{id}/favorite`
- `POST /photos/upload-url`
- `GET /users/profile`
- `PUT /users/profile`
- `GET /users/submissions`
- `GET /users/favorites`
- `GET /users/routes`
- `GET /users/saved-routes`
- `POST /routes`
- `PUT /routes/{id}`
- `DELETE /routes/{id}`
- `POST /routes/{id}/feedback`
- `GET /routes/{id}/feedback/status`
- `POST /routes/generate-pdf`

**Admin endpoints** (require Cognito `Admins` group):
- `GET /suggestions`
- `PUT /suggestions/{id}`
- `POST /suggestions/{id}/approve`
- `POST /suggestions/{id}/reject`
- `PUT /locations/{id}`
- `DELETE /locations/{id}`

---

## Endpoints

### Locations

#### Get All Locations
```
GET /locations
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| pageSize | number | No | Items per page (default: 50, max: 100) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "address": "123 Main St, Dallas, TX 75001",
      "lat": 32.7767,
      "lng": -96.7970,
      "description": "Amazing synchronized lights display",
      "photos": [],
      "status": "active",
      "likeCount": 0,
      "reportCount": 0,
      "createdAt": "2024-12-01T00:00:00Z",
      "googleMapsUrl": "https://www.google.com/maps/place/..."
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 147,
    "totalPages": 3
  }
}
```

#### Get Location by ID
```
GET /locations/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "address": "123 Main St, Dallas, TX 75001",
    "lat": 32.7767,
    "lng": -96.7970,
    "description": "Amazing synchronized lights display",
    "photos": [],
    "status": "active",
    "likeCount": 0,
    "reportCount": 0,
    "createdAt": "2024-12-01T00:00:00Z"
  }
}
```

#### Suggest Addresses (Geocoding)
```
POST /locations/suggest-addresses
```

Geocodes a partial address query and returns suggestions with coordinates.

**Request Body:**
```json
{
  "query": "424 Headlee St, Denton"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "address": "424, Headlee Street, Denton, Denton County, Texas, 76201, United States",
        "lat": 33.238452,
        "lng": -97.1375457,
        "displayName": "424, Headlee Street, Denton, Denton County, Texas, 76201, United States"
      }
    ],
    "query": "424 Headlee St, Denton"
  }
}
```

**Notes:**
- Minimum 3 characters required
- Results filtered to North Texas area (DFW region)
- Uses Nominatim (OpenStreetMap) for geocoding
- 10 second timeout with retry logic

#### Update Location (Admin Only)
```
PUT /locations/{id}
Authorization: Required (Admin)
```

Updates location details. Used for correcting descriptions, categories, or status.

**Request Body:**
```json
{
  "description": "Updated description",
  "aiDescription": "AI-generated description",
  "decorations": ["lights", "snowman", "santa"],
  "categories": ["residential"],
  "theme": "traditional",
  "displayQuality": "elaborate",
  "status": "active"
}
```

**Allowed Fields:**
- `description` - User-provided description
- `aiDescription` - AI-generated description
- `decorations` - Array of detected decorations
- `categories` - Array of categories
- `theme` - Display theme
- `displayQuality` - Quality rating (simple, moderate, elaborate)
- `status` - Location status (active, inactive, flagged)

**Response:**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": { ... }
}
```

#### Delete Location (Admin Only)
```
DELETE /locations/{id}
Authorization: Required (Admin)
```

Permanently deletes a location. Used for testing or removing invalid entries.

**Response:**
```json
{
  "success": true,
  "message": "Location deleted successfully"
}
```

---

### Suggestions

#### Submit Location Suggestion
```
POST /suggestions
Authorization: Required
```

**Request Body:**
```json
{
  "address": "424, Headlee Street, Denton, TX 76201",
  "description": "Beautiful display with synchronized lights and yard decorations",
  "lat": 33.238452,
  "lng": -97.1375457
}
```

**Validation:**
- `address`: Required
- `description`: Required, minimum 20 characters
- `lat`, `lng`: Required (from geocoding)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid"
  },
  "message": "Suggestion submitted successfully"
}
```

#### Get Suggestions (Admin Only)
```
GET /suggestions
Authorization: Required (Admin)
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | pending, approved, rejected (default: pending) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "address": "424, Headlee Street, Denton, TX 76201",
      "description": "Beautiful display with synchronized lights",
      "lat": 33.238452,
      "lng": -97.1375457,
      "photos": [],
      "status": "pending",
      "submittedBy": "cognito-user-id",
      "submittedByEmail": "user@example.com",
      "createdAt": "2025-12-04T17:56:21Z"
    }
  ]
}
```

#### Approve Suggestion (Admin Only)
```
POST /suggestions/{id}/approve
Authorization: Required (Admin)
```

Creates a new location from the suggestion.

**Response:**
```json
{
  "success": true,
  "data": {
    "locationId": "uuid"
  },
  "message": "Suggestion approved"
}
```

**Side Effects:**
- Creates new location in locations table
- Updates suggestion status to "approved"
- Records reviewer and timestamp

#### Update Suggestion (Admin Only)
```
PUT /suggestions/{id}
Authorization: Required (Admin)
```

Updates a pending suggestion before approval. Allows admins to correct descriptions and tags.

**Request Body:**
```json
{
  "description": "Updated description",
  "aiDescription": "AI-generated description",
  "detectedTags": ["lights", "snowman"],
  "categories": ["residential"],
  "theme": "traditional",
  "displayQuality": "elaborate"
}
```

**Allowed Fields:**
- `description` - User-provided description
- `aiDescription` - AI-generated description
- `detectedTags` - Array of detected decoration tags
- `categories` - Array of categories
- `theme` - Display theme
- `displayQuality` - Quality rating

**Response:**
```json
{
  "success": true,
  "message": "Suggestion updated successfully",
  "data": { ... }
}
```

**Notes:**
- Only pending suggestions can be edited
- Approved/rejected suggestions cannot be modified

#### Reject Suggestion (Admin Only)
```
POST /suggestions/{id}/reject
Authorization: Required (Admin)
```

**Request Body:**
```json
{
  "reason": "Duplicate location"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Suggestion rejected"
}
```

---

### Feedback

#### Submit Feedback (Like/Unlike)
```
POST /locations/{id}/feedback
Authorization: Required
```

**Request Body:**
```json
{
  "type": "like"
}
```

**Validation:**
- `type`: Required, must be "like"
- Toggles like on/off (unlike if already liked)

#### Get Feedback Status
```
GET /locations/{id}/feedback/status
Authorization: Required
```

Returns current user's feedback for a location.

**Response:**
```json
{
  "success": true,
  "data": {
    "locationId": "uuid",
    "liked": true,
    "reported": false,
    "favorited": true,
    "likedAt": "2024-12-06T00:00:00Z",
    "favoritedAt": "2024-12-06T00:00:00Z"
  }
}
```

#### Toggle Favorite
```
POST /locations/{id}/favorite
Authorization: Required
```

Toggles favorite status for a location (add/remove from favorites).

**Response:**
```json
{
  "success": true,
  "data": {
    "favorited": true,
    "locationId": "uuid"
  },
  "message": "Added to favorites!"
}
```

#### Report Location
```
POST /locations/{id}/report
Authorization: Required
```

**Request Body:**
```json
{
  "reason": "Lights are no longer up"
}
```

### Users

#### Get User Profile
```
GET /users/profile
Authorization: Required
```

Returns authenticated user's profile with submission statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "JollyReindeerRider",
    "isAdmin": false,
    "joinDate": "2024-12-01T00:00:00Z",
    "stats": {
      "totalSubmissions": 5,
      "approvedSubmissions": 3,
      "pendingSubmissions": 1,
      "rejectedSubmissions": 1
    }
  }
}
```

**Notes:**
- `username` is an AI-generated Christmas-themed username assigned on first login
- Username can be changed via PUT /users/profile

#### Update User Profile
```
PUT /users/profile
Authorization: Required
```

Updates the authenticated user's profile (currently username only).

**Request Body:**
```json
{
  "username": "MerrySnowflakeExplorer"
}
```

**Validation:**
- `username`: Required, 3-30 characters, alphanumeric and underscores only
- Username must be unique (not already taken by another user)

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "username": "MerrySnowflakeExplorer",
    "updatedAt": "2025-12-10T00:00:00Z"
  },
  "message": "Profile updated successfully"
}
```

**Error Responses:**
- 400: "Username is required"
- 400: "Invalid username. Use only letters, numbers, and underscores (3-30 characters)"
- 400: "Username already taken"

#### Get User Submissions
```
GET /users/submissions
Authorization: Required
```

Returns authenticated user's submission history sorted by date (newest first).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "address": "123 Main St, Dallas, TX 75001",
      "description": "Beautiful light display",
      "photos": [
        "https://presigned-s3-url-1.jpg",
        "https://presigned-s3-url-2.jpg"
      ],
      "status": "approved",
      "submittedAt": "2024-12-06T00:00:00Z",
      "reviewedAt": "2024-12-06T12:00:00Z",
      "lat": 32.7767,
      "lng": -96.7970
    },
    {
      "id": "uuid-2",
      "address": "456 Oak Ave, Dallas, TX 75002",
      "description": "Festive decorations",
      "photos": [],
      "status": "rejected",
      "submittedAt": "2024-12-05T00:00:00Z",
      "reviewedAt": "2024-12-05T18:00:00Z",
      "rejectionReason": "Location already exists in database",
      "lat": 32.7834,
      "lng": -96.8001
    }
  ]
}
```

**Notes:**
- Photos are returned as presigned S3 URLs (24-hour expiry)
- `rejectionReason` only present for rejected submissions
- `reviewedAt` only present after admin review

#### Get User Favorites
```
GET /users/favorites
Authorization: Required
```

Returns authenticated user's saved favorite locations.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "address": "123 Main St, Dallas, TX 75001",
      "description": "Amazing synchronized lights display",
      "lat": 32.7767,
      "lng": -96.7970,
      "photos": ["https://..."],
      "status": "active",
      "likeCount": 42,
      "favoritedAt": "2024-12-06T00:00:00Z"
    }
  ]
}
```

**Notes:**
- Only returns active locations (inactive locations are filtered out)
- `favoritedAt` indicates when user saved the location

---

### Leaderboard

#### Get Leaderboard
```
GET /leaderboard
```

Returns public ranking of top contributors by approved submissions.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "userId": "cognito-sub",
      "username": "JollyReindeerRider",
      "approvedSubmissions": 12,
      "joinDate": "2024-12-01T00:00:00Z",
      "badge": {
        "type": "enthusiast",
        "label": "Enthusiast"
      }
    }
  ]
}
```

**Badge Thresholds:**
- First Light: 1 approved submission
- Scout: 5 approved submissions
- Enthusiast: 15 approved submissions
- Expert: 50 approved submissions

**Notes:**
- Public endpoint (no authentication required)
- Sorted by approved submissions (descending)
- Includes highest earned badge for each contributor

#### Get Locations Leaderboard
```
GET /leaderboard/locations
```

Returns top locations ranked by like count.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "locationId": "uuid",
      "address": "123 Main St, Dallas, TX 75001",
      "description": "Amazing synchronized lights display",
      "aiDescription": "AI-generated description",
      "likeCount": 42,
      "photos": ["https://..."],
      "createdBy": "cognito-sub",
      "createdByUsername": "JollyReindeerRider",
      "decorations": ["lights", "snowman"],
      "displayQuality": "elaborate"
    }
  ]
}
```

**Notes:**
- Public endpoint (no authentication required)
- Returns top 50 locations sorted by like count (descending)
- Only includes active locations

---

### Photos

#### Get Upload URL
```
POST /photos/upload-url
Authorization: Required
```

Generates a presigned S3 URL for uploading photos.

**Request Body:**
```json
{
  "contentType": "image/jpeg",
  "fileSize": 5242880,
  "suggestionId": "uuid"
}
```

**Validation:**
- `contentType`: Required, must be image/jpeg, image/png, image/webp, image/heic, or image/heif
- `fileSize`: Required, max 20MB (20971520 bytes)
- `suggestionId`: Optional, associates photo with a suggestion

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://bucket.s3.amazonaws.com/",
    "fields": {
      "key": "pending/user-id/photo-id.jpg",
      "Content-Type": "image/jpeg",
      "policy": "...",
      "x-amz-signature": "..."
    },
    "photoKey": "pending/user-id/photo-id.jpg",
    "expiresIn": 900
  }
}
```

**Notes:**
- Upload using multipart/form-data POST to `uploadUrl` with `fields`
- Photos are automatically compressed to ~2MB by backend Lambda
- AI analysis runs automatically after upload (Bedrock Claude)
- Detected decorations and quality stored on suggestion record

---

### Routes

#### Get Routes (Browse)
```
GET /routes
```

Returns public routes sorted by popularity or creation date.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sort | string | No | `popular` (default) or `new` |
| limit | number | No | Max results (default: 50, max: 100) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Best of Frisco",
      "description": "Top 10 displays in Frisco area",
      "locationIds": ["loc-1", "loc-2"],
      "tags": ["frisco", "family-friendly"],
      "createdBy": "user-id",
      "createdByUsername": "JollyReindeerRider",
      "createdAt": "2024-12-10T00:00:00Z",
      "status": "active",
      "isPublic": true,
      "likeCount": 15,
      "saveCount": 8,
      "startCount": 42,
      "stopCount": 10,
      "estimatedMinutes": 90,
      "totalMiles": 12.5
    }
  ]
}
```

#### Get Route by ID
```
GET /routes/{id}
```

Returns route details with full location data.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Best of Frisco",
    "description": "Top 10 displays in Frisco area",
    "locationIds": ["loc-1", "loc-2"],
    "locations": [
      {
        "id": "loc-1",
        "address": "123 Main St, Frisco, TX",
        "lat": 33.1507,
        "lng": -96.8236,
        "description": "Amazing display",
        "photos": ["https://..."],
        "likeCount": 25,
        "displayQuality": "spectacular"
      }
    ],
    "tags": ["frisco", "family-friendly"],
    "createdBy": "user-id",
    "createdByUsername": "JollyReindeerRider",
    "createdAt": "2024-12-10T00:00:00Z",
    "status": "active",
    "isPublic": true,
    "likeCount": 15,
    "saveCount": 8,
    "startCount": 43,
    "stopCount": 10,
    "estimatedMinutes": 90,
    "totalMiles": 12.5,
    "userLiked": false,
    "userSaved": true
  }
}
```

**Notes:**
- `locations` array contains full location details in route order
- `userLiked` and `userSaved` only present for authenticated users
- `startCount` incremented on each view (analytics)
- Draft routes only visible to owner

#### Create Route
```
POST /routes
Authorization: Required
```

Creates a new route from planned stops.

**Request Body:**
```json
{
  "title": "Best of Frisco",
  "description": "Top 10 displays in Frisco area",
  "locationIds": ["loc-1", "loc-2", "loc-3"],
  "tags": ["frisco", "family-friendly"],
  "isPublic": true
}
```

**Validation:**
- `title`: Required, max 100 characters
- `locationIds`: Required, 1-20 locations
- `description`: Optional, max 500 characters
- `tags`: Optional, max 10 tags
- `isPublic`: Optional, default true

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Best of Frisco",
    "stopCount": 3,
    "estimatedMinutes": 45,
    "totalMiles": 8.2,
    ...
  },
  "message": "Route created successfully!"
}
```

#### Update Route
```
PUT /routes/{id}
Authorization: Required (Owner only)
```

Updates an existing route.

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "locationIds": ["loc-1", "loc-2"],
  "tags": ["updated-tag"],
  "isPublic": false
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Route updated successfully"
}
```

#### Delete Route
```
DELETE /routes/{id}
Authorization: Required (Owner only)
```

Permanently deletes a route and all associated feedback.

**Response:**
```json
{
  "success": true,
  "message": "Route deleted successfully"
}
```

#### Submit Route Feedback (Like/Save)
```
POST /routes/{id}/feedback
Authorization: Required
```

Like or save a route. Toggles on/off.

**Request Body:**
```json
{
  "type": "like"
}
```
or
```json
{
  "type": "save"
}
```

**Response (Like):**
```json
{
  "success": true,
  "data": {
    "liked": true,
    "id": "feedback-id",
    "routeId": "route-id"
  },
  "message": "Route liked!"
}
```

**Response (Save):**
```json
{
  "success": true,
  "data": {
    "saved": true,
    "id": "feedback-id",
    "routeId": "route-id"
  },
  "message": "Route saved!"
}
```

#### Get Route Feedback Status
```
GET /routes/{id}/feedback/status
Authorization: Required
```

Returns user's feedback status for a route.

**Response:**
```json
{
  "success": true,
  "data": {
    "routeId": "uuid",
    "liked": true,
    "saved": false
  }
}
```

#### Get User's Created Routes
```
GET /users/routes
Authorization: Required
```

Returns routes created by the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "My Route",
      "status": "active",
      "likeCount": 5,
      ...
    }
  ]
}
```

#### Get User's Saved Routes
```
GET /users/saved-routes
Authorization: Required
```

Returns routes the user has saved (bookmarked).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Saved Route",
      "createdByUsername": "OtherUser",
      ...
    }
  ]
}
```

#### Get Routes Leaderboard
```
GET /leaderboard/routes
```

Returns top routes and top route creators.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | number | No | Max routes (default: 20, max: 50) |

**Response:**
```json
{
  "success": true,
  "data": {
    "routes": [
      {
        "id": "uuid",
        "title": "Best Route Ever",
        "likeCount": 50,
        "createdByUsername": "TopCreator",
        ...
      }
    ],
    "creators": [
      {
        "rank": 1,
        "userId": "user-id",
        "username": "TopCreator",
        "routeCount": 5,
        "totalLikes": 120,
        "totalSaves": 45,
        "badge": {
          "type": "route-master",
          "label": "Route Master"
        }
      }
    ]
  }
}
```

**Route Creator Badge Thresholds:**
- Route Scout: 1 route
- Trail Blazer: 3 routes
- Route Master: 5 routes
- Legend: 10+ routes

#### Generate PDF Route Guide
```
POST /routes/generate-pdf
Authorization: Required
```

Generates a printable PDF route guide with map, directions, and QR codes.

**Request Body:**
```json
{
  "stops": [
    {
      "id": "uuid",
      "address": "123 Main St, Dallas, TX 75001",
      "lat": 32.7767,
      "lng": -96.7970,
      "description": "Amazing display",
      "photos": ["https://..."]
    }
  ]
}
```

**Validation:**
- `stops`: Required, array of 1-15 locations
- Each stop must have `id`, `address`, `lat`, `lng`

**Response:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://presigned-s3-url.pdf",
    "expiresIn": 3600
  }
}
```

**Notes:**
- PDF includes static map image, numbered stops, QR codes for navigation
- Download URL expires in 1 hour
- Festive design with holiday decorations

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Description must be at least 20 characters"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Location with ID xyz not found"
}
```

### 503 Service Unavailable
```json
{
  "success": false,
  "message": "Geocoding service timed out. Please try again."
}
```

---

## CORS

CORS headers are included on all responses, including error responses (4XX/5XX).

**Allowed Origins:**
- `https://d173b693cir3zc.cloudfront.net` (dev)
- `http://localhost:5173` (local development)

**Allowed Methods:** GET, POST, PUT, DELETE, OPTIONS

**Allowed Headers:** Content-Type, Authorization

---

## Rate Limiting

- 100 requests per second
- 200 burst capacity

---

## DynamoDB Schema

### Locations Table
- **PK:** `location#{id}`
- **SK:** `metadata`
- **Attributes:** id, address, description, lat, lng, photos, status, feedbackCount, averageRating, likeCount, reportCount, createdAt, createdBy, googleMapsUrl

### Suggestions Table
- **PK:** `SUGGESTION#{id}`
- **SK:** `METADATA`
- **Attributes:** id, address, description, lat, lng, photos, status, submittedBy, submittedByEmail, createdAt, reviewedAt, reviewedBy, rejectionReason

### Feedback Table
- **PK:** `feedback#{id}`
- **SK:** `location#{locationId}`
- **GSI:** userId-locationId-index
- **Attributes:** id, locationId, userId, type, createdAt

### Users Table
- **PK:** `userId` (Cognito sub)
- **GSI:** username-index (for uniqueness checks)
- **Attributes:** userId, username, createdAt, updatedAt

### Routes Table
- **PK:** `route#{id}`
- **SK:** `metadata`
- **GSI:** status-likeCount-index (for popular routes)
- **GSI:** status-createdAt-index (for new routes)
- **GSI:** createdBy-createdAt-index (for user's routes)
- **Attributes:** id, title, description, locationIds, tags, createdBy, createdByUsername, createdAt, updatedAt, status, isPublic, likeCount, saveCount, startCount, stopCount, estimatedMinutes, totalMiles

### Route Feedback Table
- **PK:** `routeFeedback#{id}`
- **SK:** `route#{routeId}`
- **GSI:** userId-routeId-index (for user feedback lookups)
- **Attributes:** id, routeId, userId, type (like/save), createdAt
