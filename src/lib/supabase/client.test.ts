/**
 * Supabase Connection Test
 *
 * Run with: pnpm test src/lib/supabase/client.test.ts
 *
 * Tests connection to Supabase and verifies tables are accessible.
 */
import { describe, it, expect } from 'vitest';
import { supabase } from './client';

describe('Supabase Connection', () => {
	it('should connect and access habits table', async () => {
		const { data, error, count } = await supabase
			.from('habits')
			.select('*', { count: 'exact', head: true });

		expect(error).toBeNull();
		console.log(`   ✅ habits table accessible (${count ?? 0} rows)`);
	});

	it('should connect and access habit_logs table', async () => {
		const { data, error, count } = await supabase
			.from('habit_logs')
			.select('*', { count: 'exact', head: true });

		expect(error).toBeNull();
		console.log(`   ✅ habit_logs table accessible (${count ?? 0} rows)`);
	});

	it('should access auth endpoint', async () => {
		const { data, error } = await supabase.auth.getSession();

		expect(error).toBeNull();
		console.log(`   ✅ Auth endpoint accessible`);
	});
});

