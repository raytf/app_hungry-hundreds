<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { auth } from '$lib/stores/auth';
	import { monsterStages } from '$lib/data/mockData';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	// Get redirect URL from query params
	const redirectUrl = $derived(page.url.searchParams.get('redirect') || '/');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';

		if (!email.trim()) {
			error = 'Please enter your email address';
			return;
		}

		if (!password) {
			error = 'Please enter your password';
			return;
		}

		loading = true;

		try {
			const result = await auth.signIn(email, password);

			if (!result.success) {
				error = result.error?.message ?? 'Failed to sign in. Please try again.';
				loading = false;
				return;
			}

			// Redirect to original page or home on success
			goto(redirectUrl);
		} catch (err) {
			error = 'An unexpected error occurred. Please try again.';
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign In | Hungry Hundreds</title>
</svelte:head>

<main class="page-container flex flex-1 flex-col justify-center pt-4 pb-8">
	<div class="text-center">
		<div class="mb-6">
			<span class="text-6xl">{monsterStages.baby.emoji}</span>
		</div>
		<h1 class="mb-2 font-display text-3xl font-bold text-gray-800">Welcome Back!</h1>
		<p class="mb-8 text-gray-600">Sign in to continue your habit journey</p>
	</div>

	<form onsubmit={handleSubmit} class="space-y-4">
		{#if error}
			<div class="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
				{error}
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
				disabled={loading}
			/>
		</div>

		<div>
			<label for="password" class="mb-2 block text-sm font-medium text-gray-700">Password</label>
			<input
				id="password"
				type="password"
				bind:value={password}
				class="input-field"
				placeholder="••••••••"
				autocomplete="current-password"
				disabled={loading}
			/>
		</div>

		<button type="submit" class="btn-primary w-full" disabled={loading}>
			{#if loading}
				<span class="inline-flex items-center gap-2">
					<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
					></span>
					Signing in...
				</span>
			{:else}
				Sign In
			{/if}
		</button>
	</form>

	<div class="mt-8 text-center">
		<p class="text-gray-600">
			Don't have an account?
			<a href="/auth/signup" class="font-semibold text-hungry-600 hover:text-hungry-700">
				Sign up
			</a>
		</p>
	</div>

	<div class="mt-4 text-center">
		<a href="/" class="text-sm text-gray-500 hover:text-gray-700"> ← Continue without account </a>
	</div>
</main>
