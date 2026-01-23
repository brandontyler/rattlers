# Claude Code Instructions

## Commands
```bash
# Testing (run before committing)
npm run test:run --prefix frontend
npm run test:run --prefix backend-ts

# Linting
npm run lint

# Type checking
npm run typecheck

# Deploy infrastructure
cd infrastructure && uv run cdk deploy
```

## Code Style
- Use ES modules (import/export), not CommonJS
- Use Zod for runtime validation in backend
- Use TanStack Query for data fetching in frontend
- Follow existing patterns in codebase

## Git Workflow
- ALWAYS create new branch: `claude/<description>-<session-id>`
- Never reuse branches from previous tasks
- Use conventional commits: `type(scope): description`
- Run tests before committing

## Testing
- Frontend: `*.test.ts` or `*.test.tsx` alongside source
- Backend: `*.test.ts` alongside source
- Bug fixes MUST include regression tests

## Project Structure
- `frontend/` - React + TypeScript + Vite + Tailwind
- `backend-ts/` - TypeScript Lambda functions
- `infrastructure/` - AWS CDK (Python)

## Verification
After changes, verify with:
1. `npm run test:run` in both frontend/ and backend-ts/
2. `npm run lint` for code style
3. `npm run typecheck` for type safety

See @docs/API.md for API endpoints and @docs/ARCHITECTURE.md for system design.
