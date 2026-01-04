# Contributing to DFW Christmas Lights Finder

Thank you for your interest in contributing! This is currently a personal project, but contributions may be accepted in the future.

## Development Setup

### Prerequisites
- Node.js 20+
- Python 3.12+ (for CDK infrastructure only)
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
   cd backend-ts
   npm install
   ```

4. **Infrastructure Setup**
   ```bash
   cd infrastructure
   uv sync
   uv run cdk bootstrap
   ```

5. **Install Git Hooks** (from root directory)
   ```bash
   cd rattlers  # Make sure you're in the root directory
   npm install  # This automatically sets up husky pre-commit hooks
   ```

## Pre-commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to run automated checks before each commit.

### What runs on commit:
- **ESLint**: Checks staged `.ts` and `.tsx` files for linting errors
- **Commit message validation**: Ensures conventional commit format

### Conventional Commit Format
All commit messages must follow this format:
```
type(scope): description
```

Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`

Examples:
```bash
feat(auth): add login functionality
fix: resolve null pointer exception
docs(readme): update installation instructions
```

### Bypassing Hooks (not recommended)
If you need to skip hooks temporarily:
```bash
git commit --no-verify -m "message"
```

## Development Workflow

### For Every Task or Feature

**IMPORTANT:** After completing any task, always follow this workflow:

1. **Create a descriptive feature branch**
   ```bash
   git checkout -b claude/feature-name-with-clear-description
   ```
   - Use `claude/` prefix for AI-assisted development
   - Include clear description of what the feature does
   - Examples:
     - `claude/user-profiles-mvp-01Wcw6enrK1uZ4S3MJFGp4Kw`
     - `claude/photo-upload-validation-fix`

2. **Make your changes**
   - Implement the feature or fix
   - Test thoroughly
   - Run tests:
     - Frontend: `cd frontend && npm run test:run && npm run build`
     - Backend: `cd backend-ts && npm run test:run`

3. **Commit with VERY descriptive commit messages**
   - Group related changes into logical commits
   - Write detailed, multi-line commit messages
   - Format: `type(scope): brief summary`
   - Include detailed explanation in commit body

   Example:
   ```bash
   git add frontend/src/pages/ProfilePage.tsx
   git commit -m "feat(frontend): add ProfilePage component with user stats and submission history

   - Display user email, join date, and admin badge
   - Show activity statistics: total, approved, pending, rejected submissions
   - Submission history with expandable cards showing details
   - Photo thumbnails, rejection reasons, and review dates
   - Mobile-responsive design with color-coded status badges
   - Empty state with call-to-action to submit first location
   - Protected route requiring authentication"
   ```

4. **Push ALL changes to the feature branch**
   ```bash
   git push -u origin claude/your-feature-branch-name
   ```

5. **Create a Pull Request**
   - Use the GitHub link provided after push, OR
   - Visit: `https://github.com/brandontyler/rattlers/pull/new/branch-name`
   - Write a comprehensive PR description including:
     - Summary of changes
     - What was implemented
     - Testing done
     - Any deployment notes

### Commit Message Guidelines

Use conventional commit format with detailed descriptions:

- `feat(scope): description` - New features
- `fix(scope): description` - Bug fixes
- `docs(scope): description` - Documentation changes
- `refactor(scope): description` - Code refactoring
- `test(scope): description` - Test additions/changes
- `chore(scope): description` - Maintenance tasks

**Always include a detailed body** explaining:
- What changed
- Why it changed
- Any important implementation details

## Code Style

### Frontend (TypeScript/React)
- Use TypeScript strict mode
- Follow React best practices
- Use functional components and hooks
- Format with Prettier (if configured)

### Backend (TypeScript)
- Use TypeScript strict mode
- Use Zod for runtime validation
- Format with Prettier (if configured)
- Type check with: `npm run typecheck`
- Lint with: `npm run lint`

### Infrastructure (Python CDK)
- Use descriptive resource names
- Add comments for complex configurations
- Follow AWS CDK best practices

## Testing

- Write tests for new features
- Ensure existing tests pass
- Aim for good test coverage

## Pull Request Process

### Creating a Pull Request

1. **Ensure quality**
   - All tests pass (`npm run test:run` in both frontend/ and backend-ts/)
   - Frontend builds successfully (`npm run build` in frontend/)
   - Code follows style guidelines
   - No TypeScript errors
   - Changes are tested locally

2. **Update documentation**
   - Update relevant `.md` files in `/docs`
   - Update API documentation if endpoints changed
   - Update README if user-facing features changed
   - Add comments for complex logic

3. **Write a comprehensive PR description**

   Include these sections:
   ```markdown
   ## Summary
   Brief overview of what was implemented

   ## Changes
   - Detailed list of what changed
   - Frontend, backend, infrastructure sections

   ## Features
   ✅ List of features added

   ## Testing
   - [x] Tested scenarios
   - [ ] Remaining tests needed

   ## Deployment Notes
   Any special deployment steps needed
   ```

4. **Link the PR**
   - After pushing, copy the PR creation link
   - Create PR on GitHub
   - Link related issues if applicable

5. **Review and merge**
   - Wait for review and address feedback
   - Once approved, merge to main
   - Delete branch after merge

## Questions?

Open an issue for questions or discussions.

## License

By contributing, you agree that your contributions will be licensed under the project's license.
