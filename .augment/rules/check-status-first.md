# Check Implementation Status First

## Rule: Read STATUS.md Before Implementation Work

Before implementing any feature, fixing bugs related to unimplemented functionality, or making architectural decisions in the Hungry Hundreds project, AI agents MUST read `STATUS.md` to understand what is actually implemented.

### Why This Rule Exists

The project documentation (TECH_SPEC.md, ARCHITECTURE.md, API.md, DEPLOYMENT.md) describes the **full vision** of the application, including features planned for future phases. Without checking STATUS.md first, an agent might:

1. Try to use Dexie.js when it's not installed yet
2. Reference Supabase client code that doesn't exist
3. Assume Rive animations are available when only emoji placeholders exist
4. Implement features that depend on unbuilt functionality

### Requirements

1. **Read STATUS.md First**

   Before any implementation work, read STATUS.md to understand:
   - Current development phase
   - What technologies are actually installed
   - What features are implemented vs. planned
   - Immediate next steps and blockers

2. **Check Dependencies Before Using Technologies**

   If you plan to use any of these technologies, verify they are installed:
   - Dexie.js (`dexie` package)
   - Supabase (`@supabase/supabase-js` package)
   - Rive (`@rive-app/canvas` package)
   - Motion One (`motion` package)
   - Firebase (`firebase` package)

3. **Reference ROADMAP.md for Phase Context**

   When working on new features, check ROADMAP.md to understand:
   - Which phase the feature belongs to
   - What dependencies must be completed first
   - Acceptance criteria for the feature

4. **Update STATUS.md After Implementation**

   When completing a feature or phase milestone:
   - Update the status table in STATUS.md
   - Move items from "Not Implemented" to "Implemented"
   - Update the "Last Updated" date
   - Adjust "Immediate Next Steps" if needed

### Workflow Example

```
1. User asks: "Add offline sync for habits"

2. Agent reads STATUS.md:
   - Current phase: Phase 1 (UI Foundation)
   - Dexie.js: ❌ Not installed
   - Supabase: ❌ Not installed
   - Sync: ❌ Not built

3. Agent responds:
   "Offline sync requires Phase 2 (Data Layer) and Phase 4 (Sync)
   to be complete. Currently, the project uses mock data.

   Would you like me to start with Phase 2 by:
   1. Installing Dexie.js
   2. Creating the db.ts schema
   3. Migrating stores to use local persistence?"
```

### Quick Reference

| Question               | Check                                    |
| ---------------------- | ---------------------------------------- |
| What's implemented?    | STATUS.md → "What's Implemented Now"     |
| What's NOT built?      | STATUS.md → "What's NOT Implemented Yet" |
| What phase are we in?  | STATUS.md → "Quick Status" table         |
| What's next?           | STATUS.md → "Immediate Next Steps"       |
| What are dependencies? | ROADMAP.md → Phase sections & diagram    |
| Full technical vision? | TECH_SPEC.md, ARCHITECTURE.md            |

### Files to Read (In Order)

1. **STATUS.md** - Implementation status (always first)
2. **docs/ROADMAP.md** - Phase details and dependencies
3. **docs/ARCHITECTURE.md** - System design (describes full vision)
4. **docs/API.md** - Data models (describes full vision)
5. **Feature doc** - `docs/features/<feature>.md` if exists

### Applicability

This rule applies when:

- Implementing new features
- Debugging issues related to missing functionality
- Making technology choices
- Estimating work or dependencies

This rule does NOT apply when:

- Answering general questions about the project
- Reviewing existing code
- Making documentation-only changes
- UI-only changes within existing components
