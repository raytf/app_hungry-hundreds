# Git Workflow

## Rule: Branch → Implement → Summarise → Commit & Push (with approval gates)

Every piece of work follows the same four-stage flow. Each stage requires explicit user
approval before the next stage begins.

---

## Stage 1 — Documentation (before any code)

For **new features**: create or update `docs/features/<feature-name>.md` (see
`documentation-driven-development.md`).

For **bug fixes / technical debt**: create or update `docs/fixes/<fix-name>.md` (see
`fix-documentation.md`).

For **changes to existing patterns**: update the relevant docs (see
`documentation-maintenance.md`).

Present the documentation to the user and **wait for approval** before writing any code.

---

## Stage 2 — Branch creation (after doc approval)

Once documentation is approved, create a feature branch **from `main`** unless the user
specifies otherwise:

```bash
git checkout main && git pull origin main
git checkout -b <type>/<short-description>
```

**Branch naming convention:**

| Work type | Prefix | Example |
|---|---|---|
| New feature | `feat/` | `feat/chat-page` |
| Bug fix | `fix/` | `fix/weekly-target-fallback` |
| Design / UI | `design/` | `design/phase-d-habitcard` |
| Refactor | `refactor/` | `refactor/sync-queue` |
| Chore | `chore/` | `chore/remove-bottomnav` |

Use kebab-case. Keep descriptions short (2–4 words).

Begin implementation only after the branch is created.

---

## Stage 3 — Implementation (one commit per phase)

Implement the feature following the approved documentation.

**Stop after each logical phase** and summarise:
- What was changed and why
- Any deviations from the documented plan
- Files created, modified, or deleted
- A suggested commit message for that phase

**Wait for approval**, then commit that phase immediately before starting the next one:

```bash
git add -A
git commit -m "<type>(<scope>): <phase summary>"
```

Do not batch multiple phases into a single commit. Each phase should be independently
committed so the history is bisectable and rollbacks are surgical.

---

## Stage 4 — Commit, push & pull request (after implementation approval)

Once the user approves the implementation summary, suggest a commit message:

```
<type>(<scope>): <short summary>

<bullet points of key changes>
```

Follow the Conventional Commits format:
- `feat` — new feature
- `fix` — bug fix
- `design` — visual / design system change
- `refactor` — code restructure without behaviour change
- `chore` — housekeeping (deleting files, renaming, etc.)
- `docs` — documentation only

**Wait for explicit approval**, then run all three steps automatically:

```bash
# 1. Commit
git add -A
git commit -m "<approved message>"

# 2. Push
git push origin <branch-name>

# 3. Open pull request into main
gh pr create \
  --base main \
  --title "<type>(<scope>): <short summary>" \
  --body "<bullet points matching the commit message>" \
  --web=false
```

The PR is created automatically and left open for manual review and merge. Never commit,
push, or open a PR without explicit user approval of the commit message.

---

## Summary: Approval Gates

```
[Doc created/updated] → USER APPROVES
        ↓
[Branch from main created] → implementation begins
        ↓
[Phase N complete — summary + commit message] → USER APPROVES
        ↓
[git commit] ← automatic, then next phase begins
        ↓
        ... repeat for each phase ...
        ↓
[All phases done — push + PR message suggested] → USER APPROVES
        ↓
[git push + gh pr create] ← automatic, no further prompt
        ↓
[PR open on GitHub] → USER manually reviews and merges
```

---

## Applicability

This workflow applies to all code changes in the Hungry Hundreds project.

It does NOT apply to:
- Read-only exploration (checking files, running type checks)
- Answering questions without making changes
- Fixing a typo or single-line correction agreed upon in the same message
