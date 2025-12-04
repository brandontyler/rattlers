# API Documentation

**Last Updated:** December 4, 2025

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

**Admin endpoints** (require Cognito `Admins` group):
- `GET /suggestions`
- `POST /suggestions/{id}/approve`
- `POST /suggestions/{id}/reject`

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
      "feedbackCount": 0,
      "averageRating": 0,
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
    "feedbackCount": 0,
    "averageRating": 0,
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

#### Submit Feedback
```
POST /locations/{id}/feedback
Authorization: Required
```

**Request Body:**
```json
{
  "type": "like",
  "rating": 5
}
```

**Validation:**
- `type`: Required, "like" or "star"
- `rating`: Required if type is "star", 1-5

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
    "rating": null,
    "reported": false
  }
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
- **Attributes:** id, locationId, userId, type, rating, createdAt
