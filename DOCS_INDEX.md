# Documentation Index

Quick reference guide to find the right documentation for your needs.

## 🎯 I want to...

### Understand the Project

**→ Start here**: [README.md](./README.md)
- Project overview and quick start
- Tech stack summary
- Key features

**→ Then read**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- System architecture
- Design patterns
- Technical decisions
- Data models

### Set Up Development

**→ Read**: [DEVELOPMENT.md](./DEVELOPMENT.md)
- Installation steps
- Development workflow
- Testing guidelines
- Code style conventions

### Build Features

**→ Read**: [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- Step-by-step implementation guide
- Page templates
- Common patterns
- Checklists

**→ Reference**: [COMPONENTS.md](./COMPONENTS.md)
- Component API reference
- Props and events
- Usage examples
- Styling guidelines

### Work with Data

**→ Read**: [API.md](./API.md)
- Data models and schemas
- Store API reference
- Future REST endpoints
- Database schema

### Deploy the App

**→ Read**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Cloudflare Pages setup
- Build configuration
- Environment variables
- Troubleshooting

## 📂 Documentation Files

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

### [ARCHITECTURE.md](./ARCHITECTURE.md)
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

### [DEVELOPMENT.md](./DEVELOPMENT.md)
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

### [COMPONENTS.md](./COMPONENTS.md)
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

### [IMPLEMENTATION.md](./IMPLEMENTATION.md)
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

### [API.md](./API.md)
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

### [DEPLOYMENT.md](./DEPLOYMENT.md)
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

| What | Where |
|------|-------|
| Pages/Routes | `src/routes/` |
| Components | `src/lib/components/` |
| Stores | `src/lib/stores/` |
| Mock Data | `src/lib/data/mockData.js` |
| Global Styles | `src/routes/layout.css` or `src/app.css` |
| Static Assets | `static/` |
| Config Files | Root directory |

### Key Concepts

| Concept | Documentation |
|---------|---------------|
| Routing | [ARCHITECTURE.md](./ARCHITECTURE.md#routing) |
| State Management | [ARCHITECTURE.md](./ARCHITECTURE.md#state-management) |
| Component Patterns | [COMPONENTS.md](./COMPONENTS.md#component-patterns) |
| Data Models | [API.md](./API.md#data-models) |
| Styling | [DEVELOPMENT.md](./DEVELOPMENT.md#styling-guidelines) |
| Testing | [DEVELOPMENT.md](./DEVELOPMENT.md#testing) |
| Deployment | [DEPLOYMENT.md](./DEPLOYMENT.md) |

### Common Tasks

| Task | Documentation |
|------|---------------|
| Create a new page | [IMPLEMENTATION.md](./IMPLEMENTATION.md#6-create-route-structure) |
| Create a component | [DEVELOPMENT.md](./DEVELOPMENT.md#creating-a-new-component) |
| Add a habit field | [DEVELOPMENT.md](./DEVELOPMENT.md#adding-a-new-habit-field) |
| Change theme colors | [DEVELOPMENT.md](./DEVELOPMENT.md#changing-theme-colors) |
| Deploy to production | [DEPLOYMENT.md](./DEPLOYMENT.md#deployment-methods) |
| Debug store state | [IMPLEMENTATION.md](./IMPLEMENTATION.md#debugging-tips) |

## 🏷️ Tags for Semantic Search

**Architecture**: system design, tech stack, patterns, decisions, structure
**Development**: setup, workflow, coding, testing, debugging
**Components**: UI, props, events, styling, accessibility
**Implementation**: guide, checklist, templates, patterns
**API**: data models, stores, endpoints, database
**Deployment**: cloudflare, build, production, environment

## 📖 Reading Order

### For New Developers
1. [README.md](./README.md) - Overview
2. [DEVELOPMENT.md](./DEVELOPMENT.md) - Setup
3. [ARCHITECTURE.md](./ARCHITECTURE.md) - Understanding
4. [COMPONENTS.md](./COMPONENTS.md) - Reference

### For AI Agents
1. [ARCHITECTURE.md](./ARCHITECTURE.md) - System understanding
2. [API.md](./API.md) - Data structures
3. [COMPONENTS.md](./COMPONENTS.md) - UI components
4. [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Implementation patterns

### For Implementation
1. [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Step-by-step guide
2. [COMPONENTS.md](./COMPONENTS.md) - Component reference
3. [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
4. [API.md](./API.md) - Data models

### For Deployment
1. [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
3. [DEVELOPMENT.md](./DEVELOPMENT.md) - Build commands

