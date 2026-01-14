<script lang="ts">
	import { page } from '$app/stores';

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
</script>

<nav
	class="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]"
>
	<div class="mx-auto flex h-16 max-w-lg justify-around">
		{#each items as item}
			{@const active = isActive(item.href, $page.url.pathname)}
			<a
				href={item.href}
				class="flex w-16 flex-col items-center justify-center transition-colors"
				class:text-hungry-500={active}
				class:text-gray-400={!active}
				aria-current={active ? 'page' : undefined}
			>
				<span class="text-xl">{item.icon}</span>
				<span class="text-xs font-medium">{item.label}</span>
			</a>
		{/each}
	</div>
</nav>

