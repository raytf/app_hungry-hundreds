<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { RouteId } from '$app/types';
	import SyncStatusIndicator from './SyncStatusIndicator.svelte';
	import { iconTap } from '$lib/animations/transitions';

	type StaticRouteId = Exclude<RouteId, '/habits/[id]' | '/habits/[id]/edit'>;

	interface Props {
		title?: string;
		showBack?: boolean;
		/** Show compact sync status indicator in header */
		showSyncStatus?: boolean;
		right?: Snippet;
	}

	let { title = '', showBack = false, showSyncStatus = false, right }: Props = $props();

	let drawerOpen = $state(false);

	const navItems = [
		{ href: '/', label: 'Today', icon: '🏠' },
		{ href: '/habits', label: 'Habits', icon: '📋' },
		{ href: '/dashboard', label: 'Stats', icon: '📊' },
		{ href: '/settings', label: 'Settings', icon: '⚙️' }
	];

	const isActive = (href: string, currentPath: string): boolean => {
		if (href === '/') return currentPath === '/';
		return currentPath.startsWith(href);
	};

	function openDrawer() {
		drawerOpen = true;
	}

	function closeDrawer() {
		drawerOpen = false;
	}

	function handleNavClick(event: MouseEvent) {
		const target = event.currentTarget as HTMLElement;
		const iconSpan = target.querySelector('.nav-icon') as HTMLElement;
		if (iconSpan) {
			iconTap(iconSpan);
		}
		closeDrawer();
	}

	function handleBackdropKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeDrawer();
		}
	}
</script>

<header class="sticky top-0 z-50 border-b border-gray-100 bg-gray-50/80 backdrop-blur-lg">
	<div class="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
		{#if showBack}
			<a
				href={resolve('/')}
				class="-ml-2 p-2 text-gray-600 transition-colors hover:text-gray-900"
				aria-label="Go back"
			>
				<span class="text-xl">←</span>
			</a>
		{:else}
			<button
				onclick={openDrawer}
				class="-ml-2 p-2 text-gray-600 transition-colors hover:text-gray-900"
				aria-label="Open navigation menu"
			>
				<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>
		{/if}
		<h1 class="flex-1 truncate text-lg font-semibold">{title}</h1>
		<div class="flex items-center gap-2">
			{#if showSyncStatus}
				<SyncStatusIndicator compact />
			{/if}
			{#if right}
				{@render right()}
			{/if}
		</div>
	</div>
</header>

<!-- Side Drawer Navigation -->
{#if drawerOpen}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-60 bg-black/40 backdrop-blur-sm transition-opacity"
		onclick={closeDrawer}
		onkeydown={handleBackdropKeydown}
	></div>
{/if}

<nav
	class="fixed top-0 left-0 z-70 flex h-full w-72 flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out"
	class:translate-x-0={drawerOpen}
	class:-translate-x-full={!drawerOpen}
	aria-label="Main navigation"
>
	<!-- Drawer header -->
	<div class="flex h-14 items-center justify-between border-b border-gray-100 px-4">
		<span class="text-lg font-bold text-hungry-600">Hungry Hundreds</span>
		<button
			onclick={closeDrawer}
			class="p-2 text-gray-500 transition-colors hover:text-gray-900"
			aria-label="Close navigation menu"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<!-- Nav links -->
	<div class="flex-1 overflow-y-auto px-3 py-4">
		{#each navItems as item (item.href)}
			{@const active = isActive(item.href, page.url.pathname)}
			<a
				href={resolve(item.href as StaticRouteId)}
				onclick={handleNavClick}
				class="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition-colors"
				class:bg-hungry-50={active}
				class:text-hungry-700={active}
				class:text-gray-600={!active}
				class:hover:bg-gray-50={!active}
				class:hover:text-gray-900={!active}
				aria-current={active ? 'page' : undefined}
			>
				<span class="nav-icon text-xl">{item.icon}</span>
				<span>{item.label}</span>
			</a>
		{/each}
	</div>
</nav>
