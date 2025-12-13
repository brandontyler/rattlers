# 🎄 DFW Christmas Lights Finder

A community-driven web application helping families in the Dallas-Fort Worth area discover and navigate the best Christmas light displays.

## Features

- 🗺️ Interactive map with 147+ Christmas light locations
- 📍 Address autocomplete with geocoding
- 🔐 User authentication (Cognito)
- 📝 Submit and moderate location suggestions
- 🚫 **Duplicate detection** - Prevents duplicate submissions at submit time
- 🚗 Route planner with PDF generation
- 🛤️ **Route sharing** - Save, share, and discover community routes
- 🏆 **Route leaderboard** - Popular routes and top route creators
- 📸 Photo uploads with AI analysis
- 🖼️ **Add photos to existing locations** - Contribute photos to locations without them
- ❤️ Like, favorite, and report locations
- 👤 User profiles with contributor badges
- 🎅 AI-generated Christmas-themed usernames
- 📱 Mobile-responsive design

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Leaflet |
| Backend | Python 3.12, AWS Lambda, API Gateway, DynamoDB |
| Auth | AWS Cognito |
| Storage | S3 (photos), Bedrock Claude (AI analysis) |
| Infrastructure | AWS CDK, CloudFront, GitHub Actions |

## Quick Start

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend tests
cd backend && uv sync && uv run pytest

# Deploy infrastructure
cd infrastructure && uv run cdk deploy
```

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/PROJECT.md](docs/PROJECT.md) | **Start here** - Current status, roadmap, session notes |
| [docs/API.md](docs/API.md) | API endpoint reference |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design and data flow |
| [docs/TEST_PLAN.md](docs/TEST_PLAN.md) | Testing checklist |

## Project Structure

```
├── frontend/           # React TypeScript app
├── backend/            # Python Lambda functions
├── infrastructure/     # AWS CDK
├── docs/               # Documentation
└── scripts/            # Utility scripts
```

## Contributing

1. Create feature branch from `main`
2. Make changes and test locally
3. Push and create pull request
4. GitHub Actions deploys on merge

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

**Made with ❤️ for the DFW community**
