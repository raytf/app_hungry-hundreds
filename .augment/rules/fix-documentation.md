# Fix Documentation Standards

## Rule: Document Technical Fixes Separately from Features

When addressing bugs, technical debt, or system issues in the Hungry Hundreds project, fix documentation MUST be created following these standards to separate reactive fixes from proactive feature development.

## Directory Structure

### Fix Documentation Location

All fix documentation must be placed in:

```
docs/fixes/<fix-name>.md
```

**NOT** in `docs/features/` - that directory is reserved for new functionality.

### File Naming Convention

Use **kebab-case** for fix documentation files:

- ✅ `multi-device-sync-fix.md`
- ✅ `offline-cache-corruption-fix.md`
- ✅ `auth-session-expiry-fix.md`
- ❌ `MultiDeviceSyncFix.md` (PascalCase)
- ❌ `multi_device_sync_fix.md` (snake_case)
- ❌ `fix-123.md` (numeric IDs without description)

**Naming Pattern:** `<affected-system>-<problem-description>-fix.md`

---

## Required Sections for Fix Documentation

Every fix document MUST include these sections:

### 1. Title and Purpose

```markdown
# Fix: <Descriptive Title>

## Purpose
Brief description of what the fix addresses and why it's needed.
```

### 2. Executive Summary

```markdown
## Executive Summary
- 2-3 sentence overview
- Bulleted list of main issues being fixed
- Expected outcome after implementation
- Estimated total implementation time
```

### 3. Problem Analysis

```markdown
## Problem Analysis

### Issue 1: <Issue Name>
**Root Cause:** Technical explanation of why this happens
**Current Behavior:** Code example or description
**Impact:** What users/system experience as a result
```

### 4. Implementation Plan

```markdown
## Implementation Plan

### Phase N: <Phase Name> (Priority: Critical/High/Medium/Low)
**File:** `path/to/file.ts`
**Changes:** Description and code examples
```

### 5. Implementation Order

```markdown
## Implementation Order
| Order | Phase | Files Changed | Risk Level | Time Est. |
|-------|-------|---------------|------------|-----------|
```

### 6. Testing Strategy

```markdown
## Testing Strategy
### Unit Tests
### Integration Tests
### Manual Testing Checklist
```

### 7. Edge Cases

```markdown
## Edge Cases
### 1. <Edge Case Name>
**Scenario:** Description
**Handling:** How the fix addresses it
```

### 8. Rollback Plan

```markdown
## Rollback Plan
### Immediate Rollback
### Partial Rollback by Feature
### Data Recovery
```

### 9. Performance Considerations

```markdown
## Performance Considerations
- Bundle size impact
- Memory impact
- Runtime performance impact
```

### 10. Acceptance Criteria

```markdown
## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

---

## When to Create Fix Documentation vs Feature Documentation

### Create Fix Documentation When:

| Trigger | Example |
|---------|---------|
| Bug report from production | "Users see wrong data on different devices" |
| Technical debt resolution | "Refactor sync to handle auth state" |
| Security vulnerability | "Fix XSS in user input handling" |
| Performance regression | "Optimize slow database queries" |
| System inconsistency | "Resolve race condition in sync" |

### Create Feature Documentation When:

| Trigger | Example |
|---------|---------|
| New user-facing functionality | "Add habit archiving feature" |
| New API endpoints | "Create push notification endpoint" |
| New UI components | "Build weekly progress chart" |
| New integrations | "Integrate Rive animations" |

---

## Differences: Fix vs Feature Documentation

| Aspect | Fix Documentation | Feature Documentation |
|--------|-------------------|----------------------|
| **Location** | `docs/fixes/` | `docs/features/` |
| **Focus** | Root cause analysis, debugging | User stories, requirements |
| **Sections** | Problem Analysis, Edge Cases, Rollback | User Story, UI/UX Design |
| **Tone** | Diagnostic, investigative | Aspirational, descriptive |
| **Trigger** | Reactive (something broken) | Proactive (something new) |
| **Rollback Plan** | Required | Optional |
| **Edge Cases** | Required (failure scenarios) | Recommended (usage scenarios) |

---

## Applicability

This rule applies when:

- Fixing bugs or issues discovered in production
- Resolving technical debt
- Addressing system inconsistencies
- Patching security vulnerabilities
- Fixing performance regressions

This rule does NOT apply when:

- Implementing new features
- Adding new UI components
- Creating new API endpoints
- General documentation updates

---

## Related Files

- `docs/fixes/` - Fix documentation directory
- `docs/features/` - Feature documentation directory
- `.augment/rules/documentation-driven-development.md` - Feature documentation standards
- `.augment/rules/documentation-maintenance.md` - General documentation practices

