# Christmas Lights Finder - TypeScript Backend

A fully typed, modular TypeScript backend for the Christmas Lights Finder application. This backend is designed to be deployed as AWS Lambda functions with API Gateway.

## Features

- **Strict TypeScript**: Full type safety with strict compiler options
- **Modular Architecture**: Clean separation of concerns with shared utilities
- **Comprehensive Testing**: Vitest-based test suite with mocking support
- **Zod Validation**: Runtime request validation with type inference
- **AWS SDK v3**: Modern AWS SDK with tree-shaking support
- **ESBuild Bundling**: Fast, efficient Lambda bundling

## Project Structure

```
backend-ts/
├── src/
│   ├── functions/           # Lambda function handlers
│   │   ├── locations/       # Location CRUD operations
│   │   ├── routes/          # Route management
│   │   ├── users/           # User profiles & leaderboards
│   │   ├── feedback/        # Likes, favorites, reports
│   │   ├── suggestions/     # User submissions
│   │   ├── photos/          # Photo uploads & analysis
│   │   └── auth/            # Cognito triggers
│   ├── shared/              # Shared code
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Utility functions
│   │   └── db/              # DynamoDB operations
│   └── test/                # Test setup
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── esbuild.config.mjs
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for deployment
npm run build
```

## Lambda Functions

### Locations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/locations` | GET | List locations with filtering |
| `/locations/{id}` | GET | Get location by ID |
| `/locations` | POST | Create location (admin) |
| `/locations/{id}` | PUT | Update location (admin) |
| `/locations/{id}` | DELETE | Delete location (admin) |
| `/locations/check-duplicate` | POST | Check for duplicates |
| `/locations/suggest` | GET | Suggest addresses |

### Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/routes` | GET | List public routes |
| `/routes/{id}` | GET | Get route with locations |
| `/routes` | POST | Create route |
| `/routes/{id}` | PUT | Update route |
| `/routes/{id}` | DELETE | Delete route |
| `/routes/{id}/feedback` | POST | Like/save route |
| `/routes/leaderboard` | GET | Route creators leaderboard |

### Users

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users/{id}/profile` | GET | Get user profile |
| `/users/me/profile` | PUT | Update own profile |
| `/users/{id}/submissions` | GET | Get user submissions |
| `/users/leaderboard` | GET | User leaderboard |

### Feedback

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/locations/{id}/feedback` | POST | Like a location |
| `/locations/{id}/favorite` | POST | Toggle favorite |
| `/locations/{id}/report` | POST | Report location |
| `/users/me/favorites` | GET | Get favorites |

### Suggestions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/suggestions` | POST | Submit suggestion |
| `/suggestions` | GET | List suggestions (admin) |
| `/suggestions/{id}/approve` | POST | Approve suggestion |
| `/suggestions/{id}/reject` | POST | Reject suggestion |

### Photos

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/photos/upload-url` | POST | Get presigned upload URL |
| `/photos/analyze` | POST | Analyze photo with AI |

## Authentication

The backend uses AWS Cognito for authentication with role-based access control:

| Group | Permissions |
|-------|------------|
| NorthPoleCouncil | Full admin access |
| Admins | Full admin access (legacy) |
| SantasHelpers | Approve/reject submissions |
| WorkshopElves | Edit location details |
| ChimneySweeps | Moderate reports |

## Environment Variables

```bash
LOCATIONS_TABLE_NAME=christmas-lights-locations
FEEDBACK_TABLE_NAME=christmas-lights-feedback
SUGGESTIONS_TABLE_NAME=christmas-lights-suggestions
ROUTES_TABLE_NAME=christmas-lights-routes
ROUTE_FEEDBACK_TABLE_NAME=christmas-lights-route-feedback
USERS_TABLE_NAME=christmas-lights-users
PHOTOS_BUCKET_NAME=christmas-lights-photos
ALLOWED_ORIGINS=http://localhost:3000,https://example.com
```

## Testing

Tests use Vitest with AWS SDK mocking:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm run test:coverage
```

## Building

The build uses esbuild for fast, efficient bundling:

```bash
npm run build
```

Each Lambda function is bundled separately with tree-shaking for minimal bundle size.

## Type Safety

The codebase uses strict TypeScript with:

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- Full Zod validation for all API inputs

## Contributing

1. Ensure all tests pass: `npm test`
2. Ensure no type errors: `npm run typecheck`
3. Ensure code is formatted: `npm run lint:fix`

## License

MIT
