# Hungry Hundreds

An offline-first PWA habit tracker with Gonn — a character-driven mascot that reacts to your habit streaks, speaks to you, and chats with you about your progress. Built with SvelteKit, Dexie.js, and Supabase. Deployed on Cloudflare Pages.

## 🎯 Project Overview

Hungry Hundreds helps users build consistent habits by:

- **Daily Habit Tracking** - Check off habits as you complete them, with support for daily, every-X-days, and weekly schedules
- **Streak Tracking** - Build momentum with consecutive day streaks; celebrate milestones at 7, 30, and 100 days
- **Gonn** — An animated Rive mascot that reacts emotionally to your progress, speaks proactively, and answers questions in the `/chat` page
- **Offline-First** - All data lives in IndexedDB (Dexie.js) and syncs to Supabase when online
- **Progress Analytics** - View completion rates and habit history on the Journey page

**Current Phase**: Phase 9 complete — Design System applied across all UI surfaces

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd sv-app

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Visit `http://localhost:5173` to see the app.

## 📚 Documentation

Comprehensive documentation for AI agents and developers:

- **[STATUS.md](./STATUS.md)** - Implementation status (what's built vs. planned)
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System architecture, tech stack, design patterns, and data models
- **[DEVELOPMENT.md](./docs/DEVELOPMENT.md)** - Development setup, workflow, testing, and coding guidelines
- **[COMPONENTS.md](./docs/COMPONENTS.md)** - UI component reference with props, usage, and styling
- **[IMPLEMENTATION.md](./docs/IMPLEMENTATION.md)** - Step-by-step implementation guide and checklists
- **[API.md](./docs/API.md)** - Data models, store API, and future REST endpoints
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Cloudflare Pages deployment process and configuration

## 🛠️ Tech Stack

- **Framework**: SvelteKit 2.x with Svelte 5.x (runes)
- **Styling**: Tailwind CSS 4.x — warm neutral design system (DM Sans + Fredoka)
- **Local DB**: Dexie.js (IndexedDB) — offline-first persistence
- **Backend**: Supabase — auth, Postgres, Edge Functions (Claude Haiku AI)
- **Animation**: Rive (`@rive-app/canvas`) + Motion One
- **Icons**: Lucide Svelte
- **PWA**: Firebase FCM, Service Worker, Web Push
- **Deployment**: Cloudflare Pages (Workers platform)
- **Testing**: Vitest (unit) + Playwright (e2e)
- **Type Safety**: TypeScript
- **Package Manager**: pnpm

## 📁 Project Structure

```
src/
├── routes/              # SvelteKit pages (file-based routing)
│   ├── +layout.svelte  # Root layout (sync, PWA, Toast)
│   ├── +page.svelte    # Home — habits + Gonn + fire bar
│   ├── chat/           # /chat — full-screen Gonn conversation
│   ├── habits/         # Habit list, new, detail, edit
│   ├── journey/        # Stats and habit history
│   └── settings/       # Settings, sync, auth
├── lib/
│   ├── components/     # Reusable UI components
│   ├── stores/         # Svelte 5 $state stores
│   ├── db/             # Dexie schema and operations
│   ├── sync/           # Offline sync queue and conflict resolution
│   ├── ai/             # Rule engine, dialogue, chat history
│   ├── animations/     # Motion One transitions, confetti
│   └── supabase/       # Client, auth, API wrapper
└── static/             # Static assets, PWA icons, manifest
```

## 🎨 Key Features

- ✅ Habit creation — daily, every-X-days, weekly, and multi-completion schedules
- ✅ Streak tracking with partial completion support (preserves streak on busy days)
- ✅ Milestone confetti at 7, 30, and 100 day streaks
- ✅ Gonn — animated Rive mascot with emotional states, head tracking, proactive dialogue
- ✅ `/chat` page — full-screen AI conversation powered by Claude Haiku via Supabase Edge Function
- ✅ Offline-first — Dexie.js local DB syncs automatically with Supabase when online
- ✅ Warm neutral design system — DM Sans + Fredoka, fire progress bar, sky/ground environment
- ✅ PWA — installable, offline caching, Firebase push notifications
- ✅ Toast notifications — habit created/deleted, sync status feedback
- ✅ Auth — Supabase sign up / sign in / sign out

## 🧪 Development Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm dev -- --open    # Start and open browser

# Building
pnpm build            # Build for production
pnpm preview          # Preview production build

# Code Quality
pnpm check            # Type-check
pnpm lint             # Lint code
pnpm format           # Format code

# Testing
pnpm test:unit        # Run unit tests
pnpm test:e2e         # Run e2e tests
pnpm test             # Run all tests
```

## 🚢 Deployment

The app is configured for Cloudflare Pages deployment:

```bash
# Build and deploy
pnpm build
pnpm wrangler pages deploy .svelte-kit/cloudflare
```

For automatic deployments, connect your repository to Cloudflare Pages. See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for details.

## 🤝 Contributing

1. Read [DEVELOPMENT.md](./docs/DEVELOPMENT.md) for setup and guidelines
2. Check [ARCHITECTURE.md](./docs/ARCHITECTURE.md) to understand the system
3. Follow the existing code style and patterns
4. Write tests for new features
5. Update documentation as needed

## 📄 License

[Add your license here]

## 🔗 Related Resources

- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Svelte 5 Documentation](https://svelte.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
