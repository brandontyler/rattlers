# Git Workflow Rules for Rattlers Project

## ⚠️ CRITICAL: After EVERY Task Completion

**MANDATORY WORKFLOW - Follow this after completing ANY task:**

### Step-by-Step Required Process

1. **Update ALL relevant documentation** FIRST
   - Update `docs/PROJECT.md` with completed features
   - Update `docs/API.md` if endpoints changed
   - Update session notes with what was accomplished
   - Update roadmap to reflect current status
   - Keep documentation as single source of truth

2. **Create a new feature branch** with very descriptive name

3. **Commit changes** with VERY descriptive commit messages

4. **Push ALL changes** to the feature branch

5. **Create a Pull Request** with comprehensive description

**DO NOT skip any of these steps. This is required for EVERY completed task.**

---

## Branch Strategy

**NEVER push directly to `main` branch.**

Always follow this workflow:

1. **Create a feature branch** with a descriptive name:
   - Format: `claude/{feature-description}-{session-id}`
   - Example: `claude/add-photo-moderation-01NXjtqTW5xshBiRTfoTniJw`

2. **Commit with VERY descriptive messages**:
   - Use conventional commit format: `type(scope): brief summary`
   - **MUST include detailed multi-line body** explaining what and why
   - Group related changes into logical commits
   - Each commit should tell the complete story
   - Example:
     ```
     feat(admin): add photo moderation queue to admin dashboard

     Implements admin interface to review, approve, or reject user-submitted
     photos before they appear on location detail pages.

     Changes:
     - Add PhotoModerationQueue component with approve/reject actions
     - Create POST /admin/photos/:id/approve endpoint
     - Create POST /admin/photos/:id/reject endpoint
     - Update admin dashboard with new "Pending Photos" tab
     - Add photo status badges (pending, approved, rejected)
     - Implement real-time photo count updates

     This allows admins to ensure quality control before photos
     are visible to public users.
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

### ✅ ALWAYS DO:
- **Update documentation FIRST** before committing code
  - Update `docs/PROJECT.md` to reflect completed work
  - Update `docs/API.md` if endpoints changed
  - Add session notes about what was accomplished
  - Update roadmap and feature status
- Create a NEW feature branch for EVERY task (never reuse branches)
- Use `claude/` prefix with descriptive name and session ID
- Write VERY descriptive multi-line commit messages with detailed bodies
- Push ALL changes to the feature branch
- Create a comprehensive Pull Request with full description
- Include what changed, why it changed, and testing done
- Group related changes into logical commits

### ❌ NEVER DO:
- Push directly to main
- Force push to main
- Commit without a detailed descriptive message
- Skip creating a PR
- Reuse old feature branches
- Push incomplete work
- Create commits with only a one-line message (always add body)
