# 🎄 DFW Christmas Lights Finder

A community-driven web application helping families in the Dallas-Fort Worth area discover and navigate the best Christmas light displays.

## Features

### MVP (Phase 1)
- 🗺️ Interactive map displaying 148+ Christmas light locations
- 📍 Search by address, zip code, or "near me"
- ⭐ Community feedback system (likes/ratings)
- 🚫 Report inactive displays
- 🔐 User authentication for contributions
- 📱 Mobile-responsive design

### Future Phases
- 🚗 Optimized route planning with customizable parameters
- 📸 User-submitted photos (with moderation)
- 💬 Moderated comments and reviews
- 📱 Native mobile apps (iOS/Android)

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS
- Leaflet (mapping library)
- React Router v6

### Backend
- Python 3.12
- AWS Lambda (serverless functions)
- API Gateway (REST API)
- DynamoDB (NoSQL database)
- Cognito (authentication)
- S3 (image storage)

### Infrastructure
- AWS CDK (Infrastructure as Code)
- CloudFront (CDN)
- Route 53 (DNS)

## Project Structure

```
.
├── frontend/           # React TypeScript application
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/            # Python Lambda functions
│   ├── functions/
│   ├── layers/
│   └── pyproject.toml
├── infrastructure/     # AWS CDK (Python)
│   ├── app.py
│   ├── stacks/
│   └── pyproject.toml
├── docs/              # Documentation
└── scripts/           # Utility scripts
```

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

#### Scripts
```bash
cd scripts
uv sync
uv run python import_locations.py --help
```

## Environment Variables

Create `.env` files in the respective directories:

### Frontend `.env`
```
VITE_API_ENDPOINT=your-api-gateway-url
VITE_COGNITO_USER_POOL_ID=your-user-pool-id
VITE_COGNITO_CLIENT_ID=your-client-id
VITE_AWS_REGION=us-east-1
```

### Backend
Environment variables are managed through CDK and injected into Lambda functions.

## Development Workflow

1. Create feature branch from `main`
2. Make changes and test locally
3. Run tests: `npm test` (frontend) or `pytest` (backend)
4. Commit with descriptive message
5. Push and create pull request
6. Deploy to dev environment for testing
7. Merge to main and deploy to production

## Cost Estimates

- **Low traffic** (< 1,000 users/month): $10-30/month
- **Medium traffic** (10,000 users/month): $50-150/month
- **High traffic** (100,000 users/month): $300-800/month

AWS Free Tier covers most MVP costs initially.

## Roadmap

- [x] Project planning and architecture
- [x] MVP development
  - [x] Infrastructure setup (CDK deployed)
  - [x] Frontend shell with map integration (Leaflet working)
  - [x] Backend API endpoints (Lambda functions)
  - [x] Authentication (Cognito)
  - [x] Basic CRUD operations
  - [x] 146 locations imported and geocoded
- [ ] Admin dashboard (In Progress)
- [ ] Community features (likes, ratings, suggestions)
- [ ] Route optimization (Future)
- [ ] Mobile apps (Future)

## Contributing

This is currently a personal project. Contributions may be accepted in the future.

## License

TBD

## Contact

For questions or suggestions, please open an issue.

---

**Made with ❤️ for the DFW community**
