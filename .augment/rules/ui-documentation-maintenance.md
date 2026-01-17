# UI Documentation Maintenance

## Rule: Keep UI.md Up-to-Date

When making changes to the UI in the Hungry Hundreds project, the UI documentation (`docs/UI.md`) must be updated accordingly.

### When to Update UI Documentation

Update `docs/UI.md` when:

1. **Adding a New Page/Route**
   - Add entry to the Route Structure table
   - Create a Page Details section
   - Document components used, layout, and features

2. **Creating a New Component**
   - Add to the appropriate component category section
   - Document props, slots, events, and usage examples
   - Include accessibility considerations

3. **Modifying Component Props or API**
   - Update the props table for the component
   - Update usage examples if the API changed
   - Note any breaking changes

4. **Adding New Navigation Paths**
   - Update the User Journey Map
   - Document new navigation patterns

5. **Adding New Utility Classes**
   - Add to the Styling Patterns section
   - Document the class name and purpose

6. **Adding Animation Integration Points**
   - Update the Animation Integration section
   - Note where Rive or Motion One should be integrated

### What to Document for Each UI Element

#### For Pages

- Route path and file location
- Purpose statement
- Layout description (numbered sections)
- Components used (list)
- Key features
- Navigation relationships

#### For Components

- File location
- Purpose statement
- Props table (name, type, default, description)
- Slots/snippets (if applicable)
- Usage example (code block)
- Visual states (if applicable)
- Accessibility features

### Documentation Checklist

When adding a new page:
- [ ] Added to Route Structure table
- [ ] Created Page Details section
- [ ] Listed components used
- [ ] Documented navigation flow
- [ ] Updated User Journey Map if needed

When adding a new component:
- [ ] Added to Components section
- [ ] Created props documentation
- [ ] Added usage example
- [ ] Noted accessibility considerations
- [ ] Updated Component Roadmap if applicable

When modifying styling:
- [ ] Updated Design Tokens if colors changed
- [ ] Updated Utility Classes if new classes added
- [ ] Verified responsive behavior documented

### Cross-Reference Requirements

When updating UI documentation, also check if updates are needed for:

| Change Type        | Also Update                           |
| ------------------ | ------------------------------------- |
| New component      | `docs/COMPONENTS.md` (detailed API)   |
| Route change       | `docs/ARCHITECTURE.md` (project structure) |
| New dependency     | `docs/DEVELOPMENT.md` (setup steps)   |
| Animation added    | STATUS.md (Phase 5 progress)          |
| PWA UI added       | STATUS.md (Phase 6 progress)          |

### Quick Updates vs. Full Documentation

**Quick Update (inline in UI.md):**
- Minor prop additions
- Bug fix-related UI changes
- Style tweaks

**Full Documentation (new section in UI.md):**
- New pages
- New components
- New navigation flows
- New design patterns

### Applicability

This rule applies when:
- Creating new pages or routes
- Creating new components
- Modifying component APIs (props, events, slots)
- Adding new navigation paths
- Changing the layout structure
- Adding new utility classes or design tokens
- Integrating animations

This rule does NOT apply when:
- Fixing bugs that don't change the API
- Refactoring without API changes
- Updating test files
- Changing internal implementation details

### Workflow Example

```
1. Developer adds new `/habits/[id]` page

2. Developer updates docs/UI.md:
   - Adds row to Route Structure table
   - Creates "Habit Detail" section under Page Details
   - Documents components used: Header, HabitCard, etc.
   - Updates User Journey Map to show new navigation

3. Developer updates COMPONENTS.md if new components created

4. Developer commits with message:
   "feat(habits): add habit detail page - see docs/UI.md"
```

### Related Files

- `docs/UI.md` - Main UI documentation
- `docs/COMPONENTS.md` - Detailed component API reference
- `docs/ARCHITECTURE.md` - System architecture (includes project structure)
- `STATUS.md` - Implementation status tracking

