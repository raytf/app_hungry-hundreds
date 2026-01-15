/**
 * Supabase Connection Test
 *
 * Run with: pnpm tsx scripts/test-supabase.ts
 *
 * Tests:
 * 1. Connection to Supabase
 * 2. habits table exists and is accessible
 * 3. habit_logs table exists and is accessible
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey =
	process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

console.log('\n🔌 Supabase Connection Test\n');
console.log('━'.repeat(50));

// Check environment variables
console.log('\n1️⃣  Checking environment variables...');
if (!supabaseUrl) {
	console.error('   ❌ PUBLIC_SUPABASE_URL is not set');
	process.exit(1);
}
console.log(`   ✅ URL: ${supabaseUrl}`);

if (!supabaseKey) {
	console.error(
		'   ❌ Neither PUBLIC_SUPABASE_PUBLISHABLE_KEY nor PUBLIC_SUPABASE_ANON_KEY is set'
	);
	process.exit(1);
}
const keyType = supabaseKey.startsWith('sb_') ? 'publishable' : 'anon';
console.log(`   ✅ Key: ${keyType} key (${supabaseKey.slice(0, 20)}...)`);

// Create client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
	// Test 2: Query habits table
	console.log('\n2️⃣  Testing habits table...');
	try {
		const { data, error, count } = await supabase
			.from('habits')
			.select('*', { count: 'exact', head: true });

		if (error) {
			console.error(`   ❌ Error: ${error.message}`);
			if (error.code === '42P01') {
				console.error('   💡 Table does not exist. Run the SQL migration first.');
			}
			return false;
		}
		console.log(`   ✅ habits table accessible (${count ?? 0} rows)`);
	} catch (err) {
		console.error(`   ❌ Unexpected error:`, err);
		return false;
	}

	// Test 3: Query habit_logs table
	console.log('\n3️⃣  Testing habit_logs table...');
	try {
		const { data, error, count } = await supabase
			.from('habit_logs')
			.select('*', { count: 'exact', head: true });

		if (error) {
			console.error(`   ❌ Error: ${error.message}`);
			if (error.code === '42P01') {
				console.error('   💡 Table does not exist. Run the SQL migration first.');
			}
			return false;
		}
		console.log(`   ✅ habit_logs table accessible (${count ?? 0} rows)`);
	} catch (err) {
		console.error(`   ❌ Unexpected error:`, err);
		return false;
	}

	// Test 4: Test auth (without actually signing in)
	console.log('\n4️⃣  Testing auth endpoint...');
	try {
		const { data, error } = await supabase.auth.getSession();
		if (error) {
			console.error(`   ❌ Auth error: ${error.message}`);
			return false;
		}
		console.log(`   ✅ Auth endpoint accessible (no active session)`);
	} catch (err) {
		console.error(`   ❌ Unexpected error:`, err);
		return false;
	}

	return true;
}

// Run tests
testConnection().then((success) => {
	console.log('\n' + '━'.repeat(50));
	if (success) {
		console.log('\n✅ All tests passed! Supabase connection is working.\n');
		console.log('Next steps:');
		console.log('  1. Start Phase 4: Implement SyncQueue operations');
		console.log('  2. Add online/offline detection');
		console.log('  3. Implement background sync logic\n');
		process.exit(0);
	} else {
		console.log('\n❌ Some tests failed. Check the errors above.\n');
		process.exit(1);
	}
});

