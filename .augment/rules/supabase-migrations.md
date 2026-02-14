# Supabase Migration Best Practices

## Rule: Always Use Supabase CLI for Migration Creation

When creating database migrations for the Hungry Hundreds project, AI agents and developers MUST follow these practices to ensure proper migration management and avoid version collisions.

### Requirements

1. **Use Supabase CLI to Create Migrations**

   Always use the CLI command to generate migration files:
   ```bash
   supabase migration new <descriptive_name>
   ```

   **DO NOT** manually create migration files with custom timestamps.

2. **Migration Naming Convention**

   The Supabase CLI automatically generates filenames in this format:
   ```
   YYYYMMDDHHmmss_descriptive_name.sql
   ```

   Example:
   ```
   20260214143022_partial_completion.sql
   20260214143156_partial_criteria.sql
   ```

   This timestamp format (Year-Month-Day-Hour-Minute-Second) ensures:
   - Unique version numbers (no collisions)
   - Chronological ordering
   - Support for multiple migrations per day

3. **Make Migrations Idempotent**

   All migrations MUST be safe to run multiple times. Use these patterns:

   **For Tables:**
   ```sql
   CREATE TABLE IF NOT EXISTS table_name (...);
   ```

   **For Columns:**
   ```sql
   ALTER TABLE table_name 
     ADD COLUMN IF NOT EXISTS column_name TYPE DEFAULT value;
   ```

   **For Indexes:**
   ```sql
   CREATE INDEX IF NOT EXISTS index_name ON table_name(column);
   ```

   **For Functions:**
   ```sql
   CREATE OR REPLACE FUNCTION function_name() ...
   ```

   **For Triggers:**
   ```sql
   DROP TRIGGER IF EXISTS trigger_name ON table_name;
   CREATE TRIGGER trigger_name ...
   ```

   **For Policies:**
   ```sql
   DROP POLICY IF EXISTS "policy_name" ON table_name;
   CREATE POLICY "policy_name" ON table_name ...
   ```

   **For Constraints:**
   ```sql
   DO $$ BEGIN
     ALTER TABLE table_name 
       ADD CONSTRAINT constraint_name CHECK (...);
   EXCEPTION
     WHEN duplicate_object THEN NULL;
   END $$;
   ```

   **For Enums:**
   ```sql
   DO $$ BEGIN
     CREATE TYPE enum_name AS ENUM ('value1', 'value2');
   EXCEPTION
     WHEN duplicate_object THEN NULL;
   END $$;
   ```

4. **Apply Migrations with CLI**

   Use the Supabase CLI to apply migrations:
   ```bash
   supabase db push
   ```

   This automatically:
   - Tracks which migrations have been applied
   - Runs only pending migrations
   - Updates the `schema_migrations` table

5. **Check Migration Status**

   Before creating new migrations, check what's already applied:
   ```bash
   supabase migration list
   ```

### Workflow Example

```bash
# 1. Check current migration status
supabase migration list

# 2. Create a new migration (CLI generates timestamp automatically)
supabase migration new add_user_preferences

# 3. Edit the generated file: supabase/migrations/20260214150430_add_user_preferences.sql
# Write idempotent SQL using patterns above

# 4. Apply the migration
supabase db push

# 5. Verify it was applied
supabase migration list
```

### Common Mistakes to Avoid

❌ **DON'T** manually create files like `20260214_my_migration.sql` (date only)
✅ **DO** use `supabase migration new my_migration` (generates full timestamp)

❌ **DON'T** create multiple migrations with the same timestamp prefix
✅ **DO** let the CLI generate unique timestamps automatically

❌ **DON'T** write migrations that fail when run twice
✅ **DO** use `IF NOT EXISTS`, `IF EXISTS`, `CREATE OR REPLACE`, and exception handling

❌ **DON'T** apply migrations manually via SQL Editor without tracking
✅ **DO** use `supabase db push` to apply and track migrations

### Fixing Already-Applied Migrations

If you've manually run migrations via SQL Editor, mark them as applied:

```bash
supabase migration repair <migration_name> --status applied
```

### Files to Reference

- Migration directory: `supabase/migrations/`
- Example idempotent migrations:
  - `20260115_initial_schema.sql` - Shows trigger, policy, and function patterns
  - `20260205_flexible_streaks.sql` - Shows constraint exception handling
  - `20260214_partial_completion.sql` - Shows enum creation pattern

### Why This Matters

- **Prevents version collisions**: Unique timestamps avoid duplicate key errors
- **Maintains migration order**: Chronological execution is guaranteed
- **Enables safe reruns**: Idempotent migrations can be applied multiple times
- **Tracks migration state**: CLI automatically records what's been applied
- **Supports team collaboration**: Everyone uses the same migration workflow

