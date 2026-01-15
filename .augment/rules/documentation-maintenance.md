# Documentation Maintenance

## Rule: Keep Documentation Up-to-Date

When introducing new approaches, patterns, or methodologies to the Hungry Hundreds project, all relevant documentation must be updated accordingly.

### Requirements

1. **Update Documentation When Changing Patterns**

   When introducing or modifying:
   - New architectural patterns → Update `ARCHITECTURE.md`
   - New dependencies or setup steps → Update `DEVELOPMENT.md`
   - New data models or API changes → Update `API.md`
   - New deployment requirements → Update `DEPLOYMENT.md`
   - New development practices → Update or create rules in `.augment/rules/`

2. **Update Rules When Establishing New Practices**

   When a new development practice is established:
   - Create a new rule file in `.augment/rules/` if it's a significant practice
   - Update existing rules if extending current practices
   - Document the rationale for the practice

3. **Maintain Consistency Across Documentation**

   Ensure all documentation files are consistent:
   - Tech stack descriptions should match across all files
   - Data model definitions should be consistent
   - Setup instructions should reflect current requirements
   - Related documentation links should be up-to-date

4. **Reference Documentation in Commits**

   When documentation is updated as part of a change:
   - Include "Docs:" prefix in commit message when primarily updating docs
   - Reference updated documentation in feature commit messages
   - Example: `feat(habits): add archive feature - see docs/features/habit-archive.md`

### Documentation Files to Maintain

| File                   | Purpose                      | Update When                                       |
| ---------------------- | ---------------------------- | ------------------------------------------------- |
| `STATUS.md`            | Implementation status        | Completing features, changing phases, blockers    |
| `docs/ARCHITECTURE.md` | System design and patterns   | Adding new patterns, components, or services      |
| `docs/DEVELOPMENT.md`  | Setup and workflow           | Adding dependencies, changing setup, new scripts  |
| `docs/API.md`          | Data models and endpoints    | Changing Dexie/Supabase schemas, adding endpoints |
| `docs/DEPLOYMENT.md`   | Deployment process           | Adding services, changing infra, new requirements |
| `docs/TECH_SPEC.md`    | Full technical specification | Major feature additions or architectural changes  |
| `.augment/rules/*.md`  | Development rules            | Establishing new practices                        |

### Project-Specific Considerations

When updating documentation, consider the Hungry Hundreds architecture:

1. **Offline-First PWA**
   - Document how features work offline
   - Explain sync behavior for new data models
   - Note service worker implications

2. **Supabase + Dexie Stack**
   - Update both local (Dexie) and remote (Supabase) schemas
   - Document Row Level Security policies
   - Explain sync queue behavior

3. **Animation System**
   - Document new Rive state machine inputs
   - Note Motion One animation patterns
   - Consider mobile performance

4. **Performance Budgets**
   - Document bundle size impact
   - Note any new lazy-loaded chunks
   - Update performance metrics if targets change

### Checklist for Documentation Updates

When making changes, verify:

- [ ] All affected documentation files are updated
- [ ] New patterns are explained with examples
- [ ] Related documentation links are current
- [ ] Consistency across all documentation files
- [ ] Feature documentation exists (if new feature)
- [ ] Commit message references documentation updates

### Why This Matters

- **Onboarding**: New developers can understand the project quickly
- **Consistency**: Everyone follows the same patterns
- **Maintainability**: Future changes are easier with clear documentation
- **Quality**: Reduces confusion and implementation errors
