# Documentation-Driven Development

## Rule: Feature Documentation Before Implementation

Before implementing any new feature in the Hungry Hundreds project, a documentation file MUST be created first.

### Requirements

1. **Create a Feature Documentation File**
   - Location: `docs/features/<feature-name>.md`
   - The file must be created BEFORE any code implementation begins

2. **Required Documentation Sections**
   
   Each feature document must include:
   
   ```markdown
   # Feature: <Feature Name>
   
   ## Purpose
   What problem does this feature solve? Why is it needed?
   
   ## User Story
   As a [user type], I want [goal] so that [benefit].
   
   ## Implementation Approach
   
   ### Technical Design
   - What components/files will be created or modified?
   - What data models are involved (Dexie/Supabase)?
   - What stores or state management is needed?
   
   ### UI/UX Design
   - What screens or components are needed?
   - What animations (Rive/Motion One) are involved?
   - How does this work offline?
   
   ### Integration Points
   - How does this feature interact with existing code?
   - What API endpoints (Supabase Edge Functions) are needed?
   - How does this affect sync logic?
   
   ## Acceptance Criteria
   - [ ] Criterion 1
   - [ ] Criterion 2
   - [ ] Works offline
   - [ ] Syncs correctly when online
   
   ## Performance Considerations
   - Bundle size impact
   - Animation performance on mobile
   - Offline storage requirements
   ```

3. **Implementation Must Follow Documentation**
   - The actual implementation should follow the documented approach
   - Any deviations from the documented approach must be updated in the documentation
   - The documentation serves as the source of truth for the feature

### Example

For a "Habit Archive" feature:

1. First create: `docs/features/habit-archive.md`
2. Document the purpose, approach, and integration points
3. Get alignment on the approach (if working with others)
4. Then implement following the documented design

### Why This Matters

- **Clarity**: Forces thinking through the design before coding
- **Consistency**: Ensures features align with the offline-first PWA architecture
- **Maintainability**: Creates a knowledge base for future developers
- **Quality**: Reduces rework by catching design issues early

### Applicability

This rule applies to:
- New user-facing features
- New API endpoints
- Significant changes to existing functionality
- New data models or schema changes

This rule does NOT apply to:
- Bug fixes
- Minor UI tweaks
- Refactoring without behavior changes
- Documentation-only changes

