# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hungry Hundreds is an offline-first PWA habit tracker built with SvelteKit, Dexie.js (IndexedDB), and Supabase. The app works offline and syncs when online.

## Commands

```bash
pnpm dev              # Start dev server at localhost:5173
pnpm build            # Build for production (Cloudflare Pages)
pnpm preview          # Preview production build with Wrangler
pnpm check            # TypeScript type-check
pnpm lint             # ESLint + Prettier check
pnpm format           # Format with Prettier
pnpm test:unit        # Run Vitest unit tests
pnpm test:e2e         # Run Playwright E2E tests
pnpm test             # Run all tests
```

Run a single test file: `pnpm test:unit src/lib/db/habits.spec.ts`

## Architecture

**Stack:** SvelteKit 2 + Svelte 5 (runes) + Tailwind CSS 4 + TypeScript + Dexie.js + Supabase + Firebase (FCM)

**Key directories:**
- `src/lib/db/` - Dexie database schema (`db.ts`) and data operations (`habits.ts`, `habitLogs.ts`)
- `src/lib/stores/` - Svelte stores for reactive state (`habits.ts`, `auth.ts`, `stats.ts`)
- `src/lib/sync/` - Offline sync system (`queue.ts`, `sync.ts`, `detector.ts`, `conflicts.ts`)
- `src/lib/supabase/` - Supabase client, auth helpers, and API wrapper
- `src/lib/components/` - Reusable Svelte components (PascalCase naming)
- `src/routes/` - SvelteKit file-based routing

**Data flow:** Local-first with Dexie.js → SyncQueue → Supabase (when online)

## Development Rules

### 1. Check STATUS.md First

Before implementing features, **always read `STATUS.md`** to understand:
- Current development phase and what's actually implemented
- Technologies installed vs. planned
- Immediate next steps

The docs describe the full vision; STATUS.md tracks reality.

### 2. Documentation-Driven Development

Before implementing a **new feature**, create `docs/features/<feature-name>.md` with:
- Purpose and user story
- Technical design (components, data models, stores)
- Integration points and acceptance criteria

This does NOT apply to bug fixes, minor tweaks, or refactoring.

### 3. Fix Documentation

For **bug fixes and technical debt**, create `docs/fixes/<fix-name>.md` (not in features/):
- Root cause analysis
- Implementation plan with phases
- Rollback plan and edge cases

### 4. Keep Documentation Updated

When changing patterns or adding features, update:
- `STATUS.md` - Implementation status
- `docs/ARCHITECTURE.md` - System design changes
- `docs/UI.md` - New pages or components
- `docs/API.md` - Data model changes

## Code Conventions

- **Components:** PascalCase, Svelte 5 runes (`let { prop } = $props()`)
- **Stores:** camelCase TypeScript files, use `svelte/store` primitives
- **Props typing:** Use `interface Props` with `$props()`

## Key Files Reference

| Purpose | Location |
|---------|----------|
| Implementation status | `STATUS.md` |
| Development phases | `docs/ROADMAP.md` |
| System architecture | `docs/ARCHITECTURE.md` |
| Data models | `docs/API.md` |
| UI documentation | `docs/UI.md` |
| Development rules | `.augment/rules/*.md` |
