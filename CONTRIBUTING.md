# Contributing to DFW Christmas Lights Finder

Thank you for your interest in contributing! This is currently a personal project, but contributions may be accepted in the future.

## Development Setup

### Prerequisites
- Node.js 18+
- Python 3.12+
- AWS CLI configured
- AWS CDK installed

### Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rattlers
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Fill in your environment variables
   npm run dev
   ```

3. **Backend Setup**
   ```bash
   cd backend
   uv sync --all-extras
   ```

4. **Infrastructure Setup**
   ```bash
   cd infrastructure
   uv sync
   uv run cdk bootstrap
   ```

## Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests:
   - Frontend: `npm test`
   - Backend: `pytest`
4. Commit with descriptive messages
5. Push and create a pull request

## Code Style

### Frontend (TypeScript/React)
- Use TypeScript strict mode
- Follow React best practices
- Use functional components and hooks
- Format with Prettier (if configured)

### Backend (Python)
- Follow PEP 8
- Use type hints
- Format with Black: `black .`
- Lint with Flake8: `flake8`

### Infrastructure (Python CDK)
- Use descriptive resource names
- Add comments for complex configurations
- Follow AWS CDK best practices

## Testing

- Write tests for new features
- Ensure existing tests pass
- Aim for good test coverage

## Commit Messages

Use clear, descriptive commit messages:
- `feat: Add route planning feature`
- `fix: Resolve authentication bug`
- `docs: Update API documentation`
- `refactor: Improve database queries`

## Pull Request Process

1. Ensure code passes all tests
2. Update documentation as needed
3. Describe your changes in the PR description
4. Wait for review and address feedback

## Questions?

Open an issue for questions or discussions.

## License

By contributing, you agree that your contributions will be licensed under the project's license.
