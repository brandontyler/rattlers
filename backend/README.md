# Backend - DFW Christmas Lights Finder

Python-based serverless backend running on AWS Lambda.

## Structure

```
backend/
├── functions/              # Lambda function handlers
│   ├── locations/         # Location-related functions
│   ├── feedback/          # Feedback functions
│   ├── suggestions/       # Suggestion functions
│   ├── users/             # User profile functions
│   └── photos/            # Photo upload functions
├── layers/                # Lambda layers
│   └── common/           # Shared code (models, utilities)
│       └── python/
│           ├── models.py      # Data models
│           ├── responses.py   # API response helpers
│           ├── auth.py        # Authentication utilities
│           └── db.py          # DynamoDB utilities
├── tests/                # Unit tests
└── scripts/              # Utility scripts
```

## Lambda Functions

### Locations
- **get_locations.py** - `GET /locations` - List all locations with filtering
- **get_location_by_id.py** - `GET /locations/{id}` - Get single location
- **create_location.py** - `POST /locations` - Create location (admin only)
- **update_location.py** - `PUT /locations/{id}` - Update location (admin only)
- **delete_location.py** - `DELETE /locations/{id}` - Delete location (admin only)

### Feedback
- **submit_feedback.py** - `POST /locations/{id}/feedback` - Submit feedback (auth required)
- **report_inactive.py** - `POST /locations/{id}/report` - Report inactive (auth required)

### Suggestions
- **submit_suggestion.py** - `POST /suggestions` - Submit suggestion (auth required)
- **get_suggestions.py** - `GET /suggestions` - List suggestions (admin only)
- **approve_suggestion.py** - `POST /suggestions/{id}/approve` - Approve (admin only)
- **reject_suggestion.py** - `POST /suggestions/{id}/reject` - Reject (admin only)

### Photos
- **get_upload_url.py** - `POST /photos/upload-url` - Get S3 presigned URL

### Users
- **get_current_user.py** - `GET /users/me` - Get current user profile
- **update_profile.py** - `PUT /users/me` - Update user profile

## Local Development

```bash
# Install dependencies and run tests
uv sync
uv run pytest

# Run tests with coverage
uv run pytest --cov=functions --cov=layers
```

## Environment Variables

Lambda functions expect these environment variables (set by CDK):

- `LOCATIONS_TABLE_NAME` - DynamoDB table for locations
- `FEEDBACK_TABLE_NAME` - DynamoDB table for feedback
- `SUGGESTIONS_TABLE_NAME` - DynamoDB table for suggestions
- `PHOTOS_BUCKET_NAME` - S3 bucket for photos
- `AWS_REGION` - AWS region

## Shared Layer

The `common` layer provides shared utilities:

- **models.py** - Pydantic models for data validation
- **responses.py** - Standard API response builders
- **auth.py** - Authentication decorators and helpers
- **db.py** - DynamoDB table wrapper classes

## Testing

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_locations.py

# Run with verbose output
pytest -v

# Run with coverage report
pytest --cov=functions --cov=layers --cov-report=html
```

## Deployment

Deployment is handled by AWS CDK. See `/infrastructure` directory.

```bash
cd ../infrastructure
cdk deploy
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "pagination": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": { ... }
  }
}
```

## Authentication

Authentication is handled via AWS Cognito JWT tokens. The API Gateway validates tokens and passes claims to Lambda via `requestContext.authorizer.claims`.

Use decorators for auth:
```python
from auth import require_auth, require_admin

@require_auth
def handler(event, context):
    user = get_user_info(event)
    # user["id"], user["email"], user["is_admin"]
    ...

@require_admin
def handler(event, context):
    # Only admins can access
    ...
```

## Database Schema

See `/docs/ARCHITECTURE.md` for detailed DynamoDB schema.

## Future Enhancements

- [ ] Implement geocoding service (address → lat/lng)
- [ ] Add geospatial queries for proximity search
- [ ] Implement rate limiting per user
- [ ] Add caching layer (DynamoDB DAX)
- [ ] Image processing Lambda (resize, optimize)
- [ ] Email notifications for admin actions
- [ ] Webhooks for suggestion approvals
