# Documentation Index

Quick reference guide to find the right documentation for your needs.

## 🎯 I want to...

### Check Implementation Status

**→ Read first**: [STATUS.md](./STATUS.md)

- What's implemented vs. planned
- Current development phase
- Immediate next steps

**→ Then read**: [ROADMAP.md](./docs/ROADMAP.md)

- Phased development plan
- Feature dependencies
- Acceptance criteria

### Understand the Project

**→ Start here**: [README.md](./README.md)

- Project overview and quick start
- Tech stack summary
- Key features

**→ Then read**: [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

- System architecture
- Design patterns
- Technical decisions
- Data models

### Set Up Development

**→ Read**: [DEVELOPMENT.md](./docs/DEVELOPMENT.md)

- Installation steps
- Development workflow
- Testing guidelines
- Code style conventions

### Understand Gonn's Behavior (Rule Engine)

**→ Read**: [RULE_ENGINE_SPEC.md](./docs/RULE_ENGINE_SPEC.md)

- Satiation, evolution, and regression logic
- Multi-habit aggregation and mood engine
- Danger zones, celebrations, and food metaphor
- All data models and TypeScript interfaces

### Build Features

**→ Read**: [IMPLEMENTATION.md](./docs/IMPLEMENTATION.md)

- Step-by-step implementation guide
- Page templates
- Common patterns
- Checklists

**→ Reference**: [COMPONENTS.md](./docs/COMPONENTS.md)

- Component API reference
- Props and events
- Usage examples
- Styling guidelines

**→ UI Reference**: [UI.md](./docs/UI.md)

- Complete page and component catalog
- Navigation flows and user journeys
- Styling patterns and design tokens
- Animation integration points

### Work with Data

**→ Read**: [API.md](./docs/API.md)

- Data models and schemas
- Store API reference
- Future REST endpoints
- Database schema

### Deploy the App

**→ Read**: [DEPLOYMENT.md](./docs/DEPLOYMENT.md)

- Cloudflare Pages setup
- Build configuration
- Environment variables
- Troubleshooting

## 📂 Documentation Files

### [STATUS.md](./STATUS.md) ⭐

**Purpose**: Implementation status tracking

**Contains**:

- Current development phase
- What's implemented vs. planned
- Technologies installed vs. documented
- Immediate next steps
- Blockers

**Best for**: AI agents (read first), understanding current state

---

### [ROADMAP.md](./docs/ROADMAP.md)

**Purpose**: Phased development plan with dependencies

**Contains**:

- Six development phases with tasks
- Dependency diagram (Mermaid)
- Acceptance criteria per phase
- Effort estimates

**Best for**: Planning work, understanding dependencies

---

### [README.md](./README.md)

**Purpose**: Project introduction and quick start guide

**Contains**:

- Project overview
- Quick start instructions
- Tech stack summary
- Development commands
- Links to detailed docs

**Best for**: First-time visitors, getting started

---

### [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

**Purpose**: System architecture and design decisions

**Contains**:

- Tech stack details
- Project structure
- Design patterns
- Data models
- Component communication
- Performance considerations

**Best for**: Understanding the system, making architectural decisions

**Key Sections**:

- Tech Stack → Why each technology was chosen
- Project Structure → File organization
- Data Models → TypeScript interfaces
- Key Technical Decisions → Rationale for choices

---

### [DEVELOPMENT.md](./docs/DEVELOPMENT.md)

**Purpose**: Development setup and workflow

**Contains**:

- Prerequisites and setup
- Project scripts
- File structure conventions
- Styling guidelines
- Component development
- State management patterns
- Testing approaches

**Best for**: Daily development work, onboarding new developers

**Key Sections**:

- Initial Setup → Getting started
- Development Workflow → Common tasks
- Component Development → Creating components
- Testing → Unit and E2E tests

---

### [COMPONENTS.md](./docs/COMPONENTS.md)

**Purpose**: UI component reference

**Contains**:

- Component API documentation
- Props and events
- Usage examples
- Styling patterns
- Design tokens
- Accessibility guidelines

**Best for**: Using existing components, understanding component APIs

**Key Sections**:

- Core Components → Detailed component docs
- Utility Classes → Reusable CSS classes
- Design Tokens → Colors, typography, spacing
- Component Patterns → Common patterns

---

### [UI.md](./docs/UI.md)

**Purpose**: Comprehensive UI documentation and planning

**Contains**:

- Complete page and route catalog
- Component inventory with props
- Layout and navigation structure
- Styling patterns and design tokens
- Animation integration points
- Future UI features and component roadmap

**Best for**: Understanding UI architecture, planning new features, maintaining consistency

**Key Sections**:

- Pages → Route structure and page details
- Components → Full component reference
- Navigation Flow → User journey maps
- Styling Patterns → Design tokens and utilities
- Planning → Future features and component roadmap

---

### [IMPLEMENTATION.md](./docs/IMPLEMENTATION.md)

**Purpose**: Step-by-step implementation guide

**Contains**:

- Implementation checklist
- Setup steps
- Page templates
- Common patterns
- Testing checklist
- Debugging tips

**Best for**: Building new features, following implementation plan

**Key Sections**:

- Implementation Steps → Ordered checklist
- Common Implementation Patterns → Code templates
- Styling Guidelines → Consistent styling
- Next Steps → Future phases

---

### [API.md](./docs/API.md)

**Purpose**: Data models and API reference

**Contains**:

- Data model schemas
- Store API reference
- Future REST endpoints
- Database schema
- Validation rules

**Best for**: Working with data, understanding data flow

**Key Sections**:

- Data Models → TypeScript interfaces
- Store API → Current state management
- Future API Endpoints → Planned REST API
- Database Schema → D1 table definitions

---

### [RULE_ENGINE_SPEC.md](./docs/RULE_ENGINE_SPEC.md)

**Purpose**: Single source of truth for Gonn's AI companion behavior

**Contains**:

- Data models: `HabitSnapshot`, `GonnState`, `GlobalSnapshot`, `MascotState`, `DialogueRequest`
- Satiation feeding and exponential decay formulas
- Evolution stage thresholds with hysteresis
- Multi-habit aggregation and `buildGlobalSnapshot()` logic
- Danger zone definitions and priority rules
- Mood engine: `deriveMood()`, `deriveIntensity()`, `deriveMascotState()`
- Celebration events: Evolution cutscenes and Day 100 Feasts
- Regression framing, animations, and dialogue
- Food metaphor flavor tags

**Best for**: Implementing the rule engine, understanding Gonn's responses, LLM dialogue integration

**Key Sections**:

- Data Model → All TypeScript interfaces
- Satiation & Evolution → Feeding, decay, and stage transitions
- Multi-Habit Aggregation → How habits combine into Gonn's state
- Mood Engine → `deriveMascotState()` logic
- Danger Zones → Completion-count-based critical windows

---

### [DEPLOYMENT.md](./docs/DEPLOYMENT.md)

**Purpose**: Deployment process and configuration

**Contains**:

- Cloudflare Pages setup
- Wrangler configuration
- Build process
- Environment variables
- Monitoring
- Troubleshooting

**Best for**: Deploying the app, production issues

**Key Sections**:

- Deployment Methods → Automatic vs manual
- Build Process → How builds work
- Environment Configuration → Env vars
- Troubleshooting → Common issues

---

## 🔍 Quick Lookups

### File Locations

| What          | Where                                    |
| ------------- | ---------------------------------------- |
| Pages/Routes  | `src/routes/`                            |
| Components    | `src/lib/components/`                    |
| Stores        | `src/lib/stores/`                        |
| Mock Data     | `src/lib/data/mockData.js`               |
| Global Styles | `src/routes/layout.css` or `src/app.css` |
| Static Assets | `static/`                                |
| Config Files  | Root directory                           |

### Key Concepts

| Concept            | Documentation                                                                    |
| ------------------ | -------------------------------------------------------------------------------- |
| Routing            | [ARCHITECTURE.md](./docs/ARCHITECTURE.md#routing)                                |
| State Management   | [ARCHITECTURE.md](./docs/ARCHITECTURE.md#state-management)                       |
| Component Patterns | [COMPONENTS.md](./docs/COMPONENTS.md#component-patterns)                         |
| UI Pages & Layout  | [UI.md](./docs/UI.md#pages)                                                      |
| Data Models        | [API.md](./docs/API.md#data-models)                                              |
| Gonn / Rule Engine | [RULE_ENGINE_SPEC.md](./docs/RULE_ENGINE_SPEC.md)                                |
| Satiation & Evolution | [RULE_ENGINE_SPEC.md](./docs/RULE_ENGINE_SPEC.md#2-satiation--evolution)      |
| Mood Engine        | [RULE_ENGINE_SPEC.md](./docs/RULE_ENGINE_SPEC.md#5-mood-engine)                  |
| Styling            | [UI.md](./docs/UI.md#styling-patterns)                                           |
| Testing            | [DEVELOPMENT.md](./docs/DEVELOPMENT.md#testing)                                  |
| Deployment         | [DEPLOYMENT.md](./docs/DEPLOYMENT.md)                                            |

### Common Tasks

| Task                 | Documentation                                                          |
| -------------------- | ---------------------------------------------------------------------- |
| Create a new page    | [UI.md](./docs/UI.md#creating-a-new-page)                              |
| Create a component   | [UI.md](./docs/UI.md#creating-a-new-component)                         |
| Add a habit field    | [DEVELOPMENT.md](./docs/DEVELOPMENT.md#adding-a-new-habit-field)       |
| Change theme colors  | [UI.md](./docs/UI.md#design-tokens)                                    |
| Deploy to production | [DEPLOYMENT.md](./docs/DEPLOYMENT.md#deployment-methods)               |
| Debug store state    | [IMPLEMENTATION.md](./docs/IMPLEMENTATION.md#debugging-tips)           |

## 🏷️ Tags for Semantic Search

**Architecture**: system design, tech stack, patterns, decisions, structure
**Development**: setup, workflow, coding, testing, debugging
**Components**: UI, props, events, styling, accessibility
**UI**: pages, routes, navigation, layout, design tokens, animation
**Implementation**: guide, checklist, templates, patterns
**API**: data models, stores, endpoints, database
**Deployment**: cloudflare, build, production, environment
**Rule Engine**: gonn, mascot, satiation, evolution, regression, mood, danger zones, celebrations, food metaphor, LLM, dialogue

## 📖 Reading Order

### For New Developers

1. [README.md](./README.md) - Overview
2. [DEVELOPMENT.md](./docs/DEVELOPMENT.md) - Setup
3. [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Understanding
4. [UI.md](./docs/UI.md) - UI reference
5. [COMPONENTS.md](./docs/COMPONENTS.md) - Component details

### For AI Agents

1. **[STATUS.md](./STATUS.md)** - What's implemented (READ FIRST)
2. [ROADMAP.md](./docs/ROADMAP.md) - Phase dependencies
3. [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System understanding
4. [UI.md](./docs/UI.md) - UI pages and components
5. [API.md](./docs/API.md) - Data structures
6. [RULE_ENGINE_SPEC.md](./docs/RULE_ENGINE_SPEC.md) - Gonn behavior (authoritative)
7. [IMPLEMENTATION.md](./docs/IMPLEMENTATION.md) - Implementation patterns

### For UI Development

1. [UI.md](./docs/UI.md) - Complete UI reference
2. [COMPONENTS.md](./docs/COMPONENTS.md) - Detailed component APIs
3. [STATUS.md](./STATUS.md) - What's implemented
4. [ROADMAP.md](./docs/ROADMAP.md) - Planned features

### For Implementation

1. [IMPLEMENTATION.md](./docs/IMPLEMENTATION.md) - Step-by-step guide
2. [COMPONENTS.md](./docs/COMPONENTS.md) - Component reference
3. [DEVELOPMENT.md](./docs/DEVELOPMENT.md) - Development workflow
4. [API.md](./docs/API.md) - Data models

### For Deployment

1. [DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Deployment guide
2. [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System architecture
3. [DEVELOPMENT.md](./docs/DEVELOPMENT.md) - Build commands
