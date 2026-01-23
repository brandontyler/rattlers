---
name: testing
description: Testing conventions and patterns for this project
---

# Testing Conventions

## Frontend Testing (Vitest + React Testing Library)
- Test files: `*.test.ts` or `*.test.tsx` alongside source
- Run: `npm run test:run --prefix frontend`
- Use `@testing-library/react` for component tests
- Use `@testing-library/user-event` for interactions
- Mock API calls with vi.mock()

## Backend Testing (Vitest)
- Test files: `*.test.ts` alongside source
- Run: `npm run test:run --prefix backend-ts`
- Use `aws-sdk-client-mock` for AWS service mocking
- Test handlers with mocked DynamoDB responses

## Regression Tests for Bug Fixes
Always include a test that:
1. Documents the bug in test description
2. Would have failed before the fix
3. Passes after the fix

Example:
```typescript
it("should handle edge case (fixes #123)", async () => {
  // Setup that triggers the bug
  // Assert correct behavior
});
```
