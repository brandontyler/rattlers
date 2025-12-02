# API Documentation

Base URL: `https://api.christmaslights.example.com/v1`

## Authentication

Most endpoints require authentication via Cognito JWT token.

**Header:**
```
Authorization: Bearer {cognito-jwt-token}
```

**Public endpoints** (no auth required):
- `GET /locations`
- `GET /locations/{id}`

## Endpoints

### Locations

#### Get All Locations
```
GET /locations
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| lat | number | No | Latitude for proximity search |
| lng | number | No | Longitude for proximity search |
| radius | number | No | Radius in miles (default: 10) |
| search | string | No | Search by address or description |
| status | string | No | Filter by status (active, inactive) |
| minRating | number | No | Minimum average rating (1-5) |
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
      "description": "Amazing synchronized lights display with music on 99.5 FM",
      "photos": ["https://s3.amazonaws.com/..."],
      "status": "active",
      "feedbackCount": 42,
      "averageRating": 4.8,
      "likeCount": 38,
      "createdAt": "2024-11-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 148,
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
    "photos": ["https://s3.amazonaws.com/..."],
    "status": "active",
    "feedbackCount": 42,
    "averageRating": 4.8,
    "likeCount": 38,
    "reportCount": 0,
    "createdAt": "2024-11-01T00:00:00Z",
    "updatedAt": "2024-11-15T00:00:00Z"
  }
}
```

#### Create Location (Admin Only)
```
POST /locations
Authorization: Required
Admin: Required
```

**Request Body:**
```json
{
  "address": "123 Main St, Dallas, TX 75001",
  "description": "Beautiful display with Santa",
  "photos": ["https://s3.amazonaws.com/..."]
}
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
    "description": "Beautiful display with Santa",
    "photos": ["https://s3.amazonaws.com/..."],
    "status": "active",
    "createdAt": "2024-11-30T00:00:00Z"
  },
  "message": "Location created successfully"
}
```

#### Update Location (Admin Only)
```
PUT /locations/{id}
Authorization: Required
Admin: Required
```

**Request Body:**
```json
{
  "description": "Updated description",
  "status": "active",
  "photos": ["https://s3.amazonaws.com/..."]
}
```

#### Delete Location (Admin Only)
```
DELETE /locations/{id}
Authorization: Required
Admin: Required
```

Soft delete - sets status to 'inactive'.

---

### Feedback

#### Submit Feedback
```
POST /locations/{id}/feedback
Authorization: Required
```

**Request Body:**
```json
{
  "type": "like|star",
  "rating": 5
}
```

**Validation:**
- `type`: Required, must be "like" or "star"
- `rating`: Required if type is "star", must be 1-5
- User can only submit one feedback per location per day

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "locationId": "uuid",
    "type": "star",
    "rating": 5,
    "createdAt": "2024-11-30T00:00:00Z"
  },
  "message": "Feedback submitted successfully"
}
```

#### Report Inactive
```
POST /locations/{id}/report
Authorization: Required
```

**Request Body:**
```json
{
  "reason": "No lights this year"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Report submitted. Thank you for helping keep our data accurate!"
}
```

**Business Logic:**
- User can report once per location per day
- After 3 unique user reports within 7 days, location is flagged for admin review
- Admin receives notification

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
  "address": "456 Oak Ave, Plano, TX 75024",
  "description": "Great light display",
  "photos": ["https://s3.amazonaws.com/..."]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "address": "456 Oak Ave, Plano, TX 75024",
    "description": "Great light display",
    "status": "pending",
    "createdAt": "2024-11-30T00:00:00Z"
  },
  "message": "Thank you! Your suggestion has been submitted for review."
}
```

#### Get All Suggestions (Admin Only)
```
GET /suggestions
Authorization: Required
Admin: Required
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | pending, approved, rejected |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "address": "456 Oak Ave, Plano, TX 75024",
      "description": "Great light display",
      "photos": ["https://s3.amazonaws.com/..."],
      "status": "pending",
      "submittedBy": "user-id",
      "submittedByEmail": "user@example.com",
      "createdAt": "2024-11-30T00:00:00Z"
    }
  ]
}
```

#### Approve Suggestion (Admin Only)
```
POST /suggestions/{id}/approve
Authorization: Required
Admin: Required
```

Creates a new location from the suggestion and marks suggestion as approved.

**Response:**
```json
{
  "success": true,
  "data": {
    "locationId": "uuid",
    "suggestionId": "uuid"
  },
  "message": "Suggestion approved and location created"
}
```

#### Reject Suggestion (Admin Only)
```
POST /suggestions/{id}/reject
Authorization: Required
Admin: Required
```

**Request Body:**
```json
{
  "reason": "Duplicate location"
}
```

---

### Photo Upload

#### Get Upload URL
```
POST /photos/upload-url
Authorization: Required
```

Returns a pre-signed S3 URL for uploading photos.

**Request Body:**
```json
{
  "fileName": "christmas-lights.jpg",
  "contentType": "image/jpeg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/...",
    "photoUrl": "https://s3.amazonaws.com/...",
    "expiresIn": 300
  }
}
```

**Usage:**
1. Client requests upload URL
2. Client uploads file directly to S3 using the uploadUrl (PUT request)
3. Client uses photoUrl in location/suggestion submission

---

### User Profile

#### Get Current User
```
GET /users/me
Authorization: Required
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cognito-sub",
    "email": "user@example.com",
    "name": "John Doe",
    "isAdmin": false,
    "createdAt": "2024-11-01T00:00:00Z"
  }
}
```

#### Update Profile
```
PUT /users/me
Authorization: Required
```

**Request Body:**
```json
{
  "name": "John Doe"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "address": "Address is required",
      "rating": "Rating must be between 1 and 5"
    }
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin access required"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Location not found"
  }
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## Rate Limiting

- Anonymous users: 100 requests per minute
- Authenticated users: 300 requests per minute
- Admin users: 1000 requests per minute

## CORS

Allowed origins:
- `https://christmaslights.example.com`
- `http://localhost:5173` (development)

Allowed methods: GET, POST, PUT, DELETE, OPTIONS

## Versioning

API versioned via URL path: `/v1/`

Breaking changes will be released as new versions (`/v2/`).
