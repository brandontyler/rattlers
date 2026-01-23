Fix GitHub issue #$ARGUMENTS

1. Use `gh issue view $ARGUMENTS` to get issue details
2. Analyze the problem described
3. Search codebase for relevant files
4. Implement the fix
5. Write a regression test that:
   - Would have failed before the fix
   - Passes after the fix
   - Documents the bug in test description
6. Run `npm run test:run` in frontend/ and backend-ts/
7. Run `npm run lint` and `npm run typecheck`
8. Create descriptive commit following conventional commits
9. Push to feature branch and create PR
