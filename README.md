# Hungry Hundreds

A gamified habit tracking application with a virtual pet monster that evolves based on your habit completion. Built with SvelteKit and deployed on Cloudflare Pages.

## 🎯 Project Overview

Hungry Hundreds helps users build consistent habits by:

- **Daily Habit Tracking** - Check off habits as you complete them
- **Streak Tracking** - Build momentum with consecutive day streaks
- **Monster Evolution** - Watch your virtual pet grow as you complete habits
- **Progress Analytics** - Visualize your completion rates and patterns

**Current Phase**: UI Foundation (Phase 1)

- Mock data implementation
- Core UI components and layouts
- No authentication or database (coming in Phase 2)

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

- **Framework**: SvelteKit 2.x with Svelte 5.x
- **Styling**: Tailwind CSS 4.x with custom theme
- **Deployment**: Cloudflare Pages (Workers platform)
- **Testing**: Vitest (unit) + Playwright (e2e)
- **Type Safety**: TypeScript
- **Package Manager**: pnpm

## 📁 Project Structure

```
src/
├── routes/              # SvelteKit pages (file-based routing)
│   ├── +layout.svelte  # Root layout with bottom nav
│   ├── +page.svelte    # Home (today's habits)
│   ├── habits/         # Habit management pages
│   ├── dashboard/      # Statistics page
│   └── settings/       # Settings page
├── lib/
│   ├── components/     # Reusable UI components
│   ├── stores/         # Svelte stores (state management)
│   └── data/           # Mock data (temporary)
└── static/             # Static assets
```

## 🎨 Key Features

### Current (Phase 1)

- ✅ Habit creation and management
- ✅ Daily habit completion tracking
- ✅ Streak counting
- ✅ Monster display (emoji placeholder)
- ✅ Progress visualization
- ✅ Statistics dashboard
- ✅ Responsive mobile-first design

### Planned (Future Phases)

- 🔜 Cloudflare D1 database integration
- 🔜 User authentication
- 🔜 Rive-based monster animations
- 🔜 Push notifications
- 🔜 PWA offline support
- 🔜 Social features

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
