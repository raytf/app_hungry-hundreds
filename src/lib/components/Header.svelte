<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { RouteId } from '$app/types';
	import { dev } from '$app/environment';
	import { iconTap } from '$lib/animations/transitions';
	import { isOnline, isSyncing, hasPendingChanges } from '$lib/sync';
	import { Menu, Home, TrendingUp, Plus, Settings, X } from 'lucide-svelte';

	type StaticRouteId = Exclude<RouteId, '/habits/[id]' | '/habits/[id]/edit'>;

	interface Props {
		title?: string;
		showBack?: boolean;
		/** @deprecated Sync dot is always visible in the redesigned header */
		showSyncStatus?: boolean;
		right?: Snippet;
	}

	let { title = '', showBack = false, showSyncStatus: _showSyncStatus = false, right }: Props =
		$props();

	let drawerOpen = $state(false);

	const navItems = [
		{ href: '/', label: 'Home', Icon: Home },
		{ href: '/habits/new', label: 'Add Habit', Icon: Plus },
		{ href: '/journey', label: 'Journey', Icon: TrendingUp },
		{ href: '/settings', label: 'Settings', Icon: Settings }
	] as const;

	/** Today's date formatted as "Thursday, Apr 6" */
	const formattedDate = new Intl.DateTimeFormat('en-US', {
		weekday: 'long',
		month: 'short',
		day: 'numeric'
	}).format(new Date());

	/** ISO date string for the <time> element's datetime attribute */
	const isoDate = new Date().toISOString().split('T')[0];

	/** Sync dot appearance based on connection + sync state */
	const syncDotClass = $derived.by(() => {
		if (!$isOnline) return 'bg-content-subtle';
		if ($isSyncing || $hasPendingChanges) return 'bg-accent-soft animate-pulse';
		return 'bg-success';
	});

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
		const iconEl = target.querySelector('.nav-icon') as HTMLElement | null;
		if (iconEl) iconTap(iconEl);
		closeDrawer();
	}

	function handleBackdropKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') closeDrawer();
	}
</script>

<!-- Top bar: 48px, warm surface, backdrop blur -->
<header class="sticky top-0 z-30 bg-surface/90 backdrop-blur-sm">
	<!-- Grid ensures center is truly centered regardless of left/right widths -->
	<div class="mx-auto grid h-12 max-w-lg grid-cols-[1fr_auto_1fr] items-center px-6">
		<!-- Left: back arrow or hamburger -->
		<div class="flex items-center">
			{#if showBack}
				<a
					href={resolve('/')}
					class="-ml-2 p-2 text-content-muted transition-colors hover:text-content"
					aria-label="Go back"
				>
					<span class="text-xl">←</span>
				</a>
			{:else}
				<button
					onclick={openDrawer}
					class="-ml-2 p-2 text-content-muted transition-colors hover:text-content"
					aria-label="Open navigation menu"
				>
					<Menu size={24} />
				</button>
			{/if}
		</div>

		<!-- Center: page title or today's date -->
		<div class="flex justify-center">
			{#if title}
				<span class="text-body font-medium text-content">{title}</span>
			{:else}
				<time datetime={isoDate} class="text-body font-medium text-content">
					{formattedDate}
				</time>
			{/if}
		</div>

		<!-- Right: optional snippet + sync dot -->
		<div class="flex items-center justify-end gap-3">
			{#if right}
				{@render right()}
			{/if}
			<div
				class="h-2 w-2 rounded-full {syncDotClass}"
				title="Sync status"
				aria-hidden="true"
			></div>
		</div>
	</div>
</header>

<!-- Backdrop -->
{#if drawerOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-40 bg-overlay"
		onclick={closeDrawer}
		onkeydown={handleBackdropKeydown}
	></div>
{/if}

<!-- Side Drawer Navigation -->
<nav
	class="fixed top-0 left-0 z-40 flex h-full w-[280px] flex-col bg-surface-raised shadow-sheet transition-transform duration-[250ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
	style="border-radius: 0 20px 20px 0;"
	class:translate-x-0={drawerOpen}
	class:-translate-x-full={!drawerOpen}
	aria-label="Main navigation"
>
	<!-- Spacer matching header height -->
	<div class="h-12 shrink-0" aria-hidden="true"></div>

	<!-- Drawer title + close -->
	<div class="flex items-center justify-between px-6 pb-4 pt-2">
		<span class="font-display text-display-md text-content">Menu</span>
		<button
			onclick={closeDrawer}
			class="p-2 text-content-muted transition-colors hover:text-content"
			aria-label="Close navigation menu"
		>
			<X size={20} />
		</button>
	</div>

	<!-- Nav links -->
	<div class="flex-1 overflow-y-auto px-3">
		{#each navItems as item (item.href)}
			{@const active = isActive(item.href, page.url.pathname)}
			<a
				href={resolve(item.href as StaticRouteId)}
				onclick={handleNavClick}
				class="mb-1 flex h-12 items-center gap-3 rounded-xl px-3 text-body-lg font-medium transition-colors"
				class:text-accent-warm={active}
				class:bg-[rgba(232,113,58,0.08)]={active}
				class:text-content={!active}
				class:hover:bg-surface-sunken={!active}
				aria-current={active ? 'page' : undefined}
			>
				<span
					class="nav-icon"
					class:text-accent-warm={active}
					class:text-content-muted={!active}
				>
					<item.Icon size={24} />
				</span>
				<span>{item.label}</span>
			</a>
		{/each}

		{#if dev}
			<!-- Debug section — dev only -->
			<div class="mt-4 border-t border-dashed border-edge pt-4">
				<p class="mb-1 px-3 text-body-sm font-medium tracking-wider text-content-subtle uppercase">
					Debug
				</p>
				<a
					href={resolve('/monster')}
					onclick={handleNavClick}
					class="mb-1 flex h-12 items-center gap-3 rounded-xl px-3 text-body-lg font-medium transition-colors"
					class:text-accent-warm={isActive('/monster', page.url.pathname)}
					class:bg-[rgba(232,113,58,0.08)]={isActive('/monster', page.url.pathname)}
					class:text-content={!isActive('/monster', page.url.pathname)}
					class:hover:bg-surface-sunken={!isActive('/monster', page.url.pathname)}
					aria-current={isActive('/monster', page.url.pathname) ? 'page' : undefined}
				>
					<span class="nav-icon text-xl">🐉</span>
					<span>Monster Debug</span>
				</a>
			</div>
		{/if}
	</div>
</nav>
