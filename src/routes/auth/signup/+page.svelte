<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { monsterStages } from '$lib/data/mockData';

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let success = $state('');
	let loading = $state(false);

	function validatePassword(pwd: string): string | null {
		if (pwd.length < 8) {
			return 'Password must be at least 8 characters';
		}
		return null;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		success = '';

		if (!email.trim()) {
			error = 'Please enter your email address';
			return;
		}

		if (!password) {
			error = 'Please enter a password';
			return;
		}

		const passwordError = validatePassword(password);
		if (passwordError) {
			error = passwordError;
			return;
		}

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		loading = true;

		try {
			const result = await auth.signUp(email, password);

			if (!result.success) {
				error = result.error?.message ?? 'Failed to create account. Please try again.';
				loading = false;
				return;
			}

			// Check if email confirmation is required
			if (result.user && !result.session) {
				success = 'Account created! Please check your email to confirm your account.';
				loading = false;
				return;
			}

			// Redirect to onboarding on success
			goto('/onboard');
		} catch (err) {
			error = 'An unexpected error occurred. Please try again.';
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign Up | Hungry Hundreds</title>
</svelte:head>

<main class="page-container flex flex-1 flex-col justify-center pb-8 pt-4">
	<div class="text-center">
		<div class="mb-6">
			<span class="text-6xl">{monsterStages.egg.emoji}</span>
		</div>
		<h1 class="mb-2 font-display text-3xl font-bold text-gray-800">Join the Journey!</h1>
		<p class="mb-8 text-gray-600">Create an account to sync your habits across devices</p>
	</div>

	<form onsubmit={handleSubmit} class="space-y-4">
		{#if error}
			<div class="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
				{error}
			</div>
		{/if}

		{#if success}
			<div
				class="rounded-xl border border-green-200 bg-green-50 p-3 text-center text-sm text-green-600"
			>
				{success}
			</div>
		{/if}

		<div>
			<label for="email" class="mb-2 block text-sm font-medium text-gray-700">Email</label>
			<input
				id="email"
				type="email"
				bind:value={email}
				class="input-field"
				placeholder="you@example.com"
				autocomplete="email"
				disabled={loading || !!success}
			/>
		</div>

		<div>
			<label for="password" class="mb-2 block text-sm font-medium text-gray-700">Password</label>
			<input
				id="password"
				type="password"
				bind:value={password}
				class="input-field"
				placeholder="At least 8 characters"
				autocomplete="new-password"
				disabled={loading || !!success}
			/>
		</div>

		<div>
			<label for="confirm-password" class="mb-2 block text-sm font-medium text-gray-700">
				Confirm Password
			</label>
			<input
				id="confirm-password"
				type="password"
				bind:value={confirmPassword}
				class="input-field"
				placeholder="Repeat your password"
				autocomplete="new-password"
				disabled={loading || !!success}
			/>
		</div>

		<button type="submit" class="btn-primary w-full" disabled={loading || !!success}>
			{#if loading}
				<span class="inline-flex items-center gap-2">
					<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
					></span>
					Creating account...
				</span>
			{:else}
				Create Account
			{/if}
		</button>
	</form>

	<div class="mt-8 text-center">
		<p class="text-gray-600">
			Already have an account?
			<a href="/auth/signin" class="font-semibold text-hungry-600 hover:text-hungry-700">
				Sign in
			</a>
		</p>
	</div>

	<div class="mt-4 text-center">
		<a href="/" class="text-sm text-gray-500 hover:text-gray-700"> ← Continue without account </a>
	</div>
</main>

