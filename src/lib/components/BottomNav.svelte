<script lang="ts">
	import { page } from '$app/stores';
	import { iconTap } from '$lib/animations/transitions';

	const items = [
		{ href: '/', label: 'Today', icon: '🏠' },
		{ href: '/habits', label: 'Habits', icon: '📋' },
		{ href: '/dashboard', label: 'Stats', icon: '📊' },
		{ href: '/settings', label: 'Settings', icon: '⚙️' }
	];

	const isActive = (href: string, currentPath: string): boolean => {
		if (href === '/') {
			return currentPath === '/';
		}
		return currentPath.startsWith(href);
	};

	function handleNavClick(event: MouseEvent) {
		const target = event.currentTarget as HTMLElement;
		const iconSpan = target.querySelector('.nav-icon') as HTMLElement;
		if (iconSpan) {
			iconTap(iconSpan);
		}
	}
</script>

<nav
	class="fixed right-0 bottom-0 left-0 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]"
>
	<div class="mx-auto flex h-16 max-w-lg justify-around">
		{#each items as item}
			{@const active = isActive(item.href, $page.url.pathname)}
			<a
				href={item.href}
				onclick={handleNavClick}
				class="flex w-16 flex-col items-center justify-center transition-colors"
				class:text-hungry-500={active}
				class:text-gray-400={!active}
				aria-current={active ? 'page' : undefined}
			>
				<span class="nav-icon text-xl">{item.icon}</span>
				<span class="text-xs font-medium">{item.label}</span>
			</a>
		{/each}
	</div>
</nav>
