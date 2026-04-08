<script lang="ts">
	interface Props {
		label?: string;
		value?: string;
		icon?: string;
	}

	let { label = '', value = '', icon = '' }: Props = $props();
</script>

<div class="card">
	<div class="mb-2 flex items-start justify-between">
		<span class="text-sm text-content-muted">{label}</span>
		{#if icon}
			<span class="text-lg">{icon}</span>
		{/if}
	</div>
	<p class="text-2xl font-bold text-content">{value}</p>
</div>

