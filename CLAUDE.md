# Claude Code Instructions

Project-specific instructions for Claude Code when working on this repository.

## Git Branching Rules

**IMPORTANT: Always create a new branch for each new feature or task.**

- Never reuse a branch that was created for a different purpose
- Never resurrect a branch that has been merged and deleted
- Each feature, bug fix, or task should have its own dedicated branch
- Branch names should follow the pattern: `claude/<description>-<session-id>`

This prevents conflicts when branches are merged and deleted by the repository owner.

## Testing Requirements

All new features must include appropriate tests:

- Frontend tests go in `*.test.ts` or `*.test.tsx` files alongside the source
- Backend tests go in `*.test.ts` files alongside the source
- Run `npm run test:run` in both `frontend/` and `backend-ts/` before committing
- Tests must pass before code can be deployed (enforced by GitHub Actions)

## Project Structure

- `frontend/` - React + TypeScript frontend (Vite)
- `backend-ts/` - TypeScript Lambda functions
- `infrastructure/` - AWS CDK infrastructure (Python)
- `.github/workflows/` - CI/CD pipelines
