# Fix Documentation

This directory contains documentation for bug fixes and technical debt resolutions in the Hungry Hundreds project.

## Fix Status Tracking

Each fix document includes a status badge at the top:

| Status                  | Meaning                                        |
| ----------------------- | ---------------------------------------------- |
| ⏳ IN PROGRESS          | Fix is currently being implemented             |
| ✅ FIXED                | Fix has been implemented and verified          |
| 🔄 PARTIAL              | Some issues fixed, others remain               |
| ❌ REVERTED             | Fix was reverted due to issues                 |
| 🔍 INVESTIGATING        | Problem identified, solution being researched  |

## Current Fixes

| Fix | Status | Date | Description |
| --- | ------ | ---- | ----------- |
| [multi-device-sync-fix.md](./multi-device-sync-fix.md) | ✅ FIXED | 2026-01-18 | Auth-triggered sync, clear DB on logout, prevent seed data conflicts |
| [sync-queue-integration-fix.md](./sync-queue-integration-fix.md) | ✅ FIXED | 2026-01-18 | Wire up queue functions to CRUD operations for actual sync |

## Fix Document Template

Every fix document should include:

1. **Status badge** - At the top, using format: `> **Status:** ✅ FIXED (YYYY-MM-DD)`
2. **Purpose** - What problem is being fixed
3. **Executive Summary** - Root cause, impact, issues being fixed
4. **Problem Analysis** - Detailed technical analysis
5. **Implementation Plan** - Phased approach with files to change
6. **Acceptance Criteria** - Checkboxes for verification
7. **Files Changed** - Table of modified files (added after fix is complete)

## Creating a New Fix Document

```bash
# Use kebab-case naming
docs/fixes/<affected-system>-<problem>-fix.md

# Examples:
docs/fixes/auth-session-expiry-fix.md
docs/fixes/offline-cache-corruption-fix.md
```

## Difference from Features

| Aspect | `/docs/fixes/` | `/docs/features/` |
| ------ | -------------- | ----------------- |
| Trigger | Bug report, tech debt | New functionality |
| Focus | Root cause analysis | User stories |
| Tone | Diagnostic | Aspirational |
| Rollback plan | Required | Optional |

See [.augment/rules/fix-documentation.md](../../.augment/rules/fix-documentation.md) for full guidelines.

