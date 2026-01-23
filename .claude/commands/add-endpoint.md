Add a new API endpoint: $ARGUMENTS

1. Review existing endpoints in backend-ts/src/functions/ for patterns
2. Create the handler in appropriate directory under backend-ts/src/functions/
3. Use Zod for request validation (see existing handlers)
4. Add proper error handling with standardized responses
5. Write unit tests for the handler
6. Update docs/API.md with the new endpoint
7. Run tests: `npm run test:run --prefix backend-ts`
8. Commit with: `feat(api): add $ARGUMENTS endpoint`
