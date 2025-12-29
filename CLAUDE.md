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

**Bug Fix Regression Tests:**

When fixing a bug, ALWAYS add a regression test that:
1. Reproduces the original bug scenario (would have failed before the fix)
2. Verifies the fix works correctly (passes after the fix)
3. Documents the bug in the test description for future reference

Example:
```typescript
describe("race condition handling", () => {
  it("should handle duplicate like attempts gracefully", async () => {
    // This test ensures the like spam bug (Dec 29, 2025) doesn't regress
    // Bug: rapid clicks could increment counter multiple times
    // Fix: deterministic feedback IDs cause duplicate writes to fail
  });
});
```

## Documentation Requirements

**IMPORTANT: Always update documentation after completing any feature or bug fix.**

At the end of every task, add "Update documentation" as a todo item and ensure all relevant docs are current:

- `README.md` - Project overview, tech stack, quick start
- `docs/PROJECT.md` - Session notes, feature status, architecture overview
- `docs/API.md` - API endpoints (if backend changes)
- `docs/ARCHITECTURE.md` - System design (if infrastructure changes)
- `CONTRIBUTING.md` - Development workflow (if processes change)
- `frontend/README.md` - Frontend features
- `backend-ts/README.md` - Backend functions
- `infrastructure/README.md` - Deployment steps

Documentation files to check:
1. Update "Last Updated" dates where applicable
2. Add session notes in `docs/PROJECT.md` describing what was done
3. Update feature lists to reflect new functionality
4. Update code examples and commands if they changed

## Project Structure

- `frontend/` - React + TypeScript frontend (Vite)
- `backend-ts/` - TypeScript Lambda functions
- `infrastructure/` - AWS CDK infrastructure (Python)
- `.github/workflows/` - CI/CD pipelines
- `docs/` - Project documentation
