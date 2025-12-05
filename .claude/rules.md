# Git Workflow Rules for Rattlers Project

## Branch Strategy

**NEVER push directly to `main` branch.**

Always follow this workflow:

1. **Create a feature branch** with a descriptive name:
   - Format: `claude/{feature-description}-{session-id}`
   - Example: `claude/add-photo-moderation-01NXjtqTW5xshBiRTfoTniJw`

2. **Commit with descriptive messages**:
   - Use conventional commit format: `feat:`, `fix:`, `refactor:`, `docs:`, etc.
   - Provide clear, detailed commit messages
   - Example:
     ```
     feat: add photo moderation queue to admin dashboard

     Implements admin interface to review, approve, or reject user-submitted
     photos before they appear on location detail pages.

     Changes:
     - Add PhotoModerationQueue component
     - Create approve/reject API endpoints
     - Update admin dashboard with new tab
     ```

3. **Push to the feature branch**:
   ```bash
   git push -u origin claude/{feature-name}-{session-id}
   ```

4. **Create a Pull Request**:
   - Always create a PR to `main` for review
   - Provide detailed PR description with:
     - Summary of changes
     - Rationale
     - Testing checklist
     - Files changed count

## Commit Message Guidelines

- **feat:** New feature
- **fix:** Bug fix
- **refactor:** Code refactoring without functionality change
- **docs:** Documentation updates
- **chore:** Maintenance tasks (dependencies, config)
- **test:** Adding or updating tests
- **perf:** Performance improvements

## Example Workflow

```bash
# 1. Ensure on latest main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b claude/my-feature-01NXjtqTW5xshBiRTfoTniJw

# 3. Make changes and commit
git add .
git commit -m "feat: add my feature

Detailed description of what this feature does and why."

# 4. Push to feature branch
git push -u origin claude/my-feature-01NXjtqTW5xshBiRTfoTniJw

# 5. Create PR on GitHub (manual or via gh CLI if available)
```

## Important Reminders

- ✅ Always create descriptive feature branches
- ✅ Write clear, detailed commit messages
- ✅ Push to feature branch, not main
- ✅ Create PRs for all changes
- ❌ Never push directly to main
- ❌ Never force push to main
- ❌ Never commit without a descriptive message
