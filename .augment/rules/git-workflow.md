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

Before beginning a multi-phase feature, ask the user:

> "This feature has N phases. Would you like to:
> **A)** Approve each phase individually before I continue to the next, or
> **B)** Let me implement and commit all phases, leaving approval for the PR only?"

Then proceed according to their choice.

### Mode A — Phase-by-phase approval (default if single phase)

Stop after each phase and summarise:
- What was changed and why
- Any deviations from the documented plan
- Files created, modified, or deleted
- A suggested commit message for that phase

**Wait for approval**, then commit before starting the next phase:

```bash
git add -A
git commit -m "<type>(<scope>): <phase summary>"
```

### Mode B — Implement all, approve at PR

Implement and commit all phases without stopping for approval. Use the same per-phase
commit structure. Once all phases are done, summarise the full set of changes and suggest
a push + PR message for final approval.

---

Do not batch multiple phases into a single commit regardless of mode. Each phase should be
independently committed so the history is bisectable and rollbacks are surgical.

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

**Wait for explicit approval**, then run all four steps automatically:

```bash
# 1. Commit
git add -A
git commit -m "<approved message>"

# 2. Update README.md and STATUS.md to reflect the changes, then commit
git add README.md STATUS.md
git commit -m "docs: update README and STATUS for <feature>"

# 3. Push
git push origin <branch-name>

# 4. Open pull request into main
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
[Branch from main created]
        ↓
[Multi-phase? Ask: Mode A or Mode B?] → USER CHOOSES
        ↓
        MODE A                        MODE B
        ↓                             ↓
[Phase N done]                [Phase N done → git commit]
[summary + commit msg]        [Phase N+1 done → git commit]
→ USER APPROVES               [...all phases complete...]
[git commit]                          ↓
[next phase...]               [Full summary + push msg]
        ↓                     → USER APPROVES
        ...                           ↓
[All phases done]             [Update README + STATUS.md]
[push + PR msg]               [git commit docs]
→ USER APPROVES                       ↓
[Update README + STATUS.md]   [git push + gh pr create]
[git commit docs]
[git push + gh pr create]
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
