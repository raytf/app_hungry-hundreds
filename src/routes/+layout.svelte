<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import BottomNav from '$lib/components/BottomNav.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
	<meta name="theme-color" content="#f9fafb" />
	<title>Hungry Hundreds</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	{@render children()}
	<BottomNav />
</div>
