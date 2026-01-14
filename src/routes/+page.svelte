<!-- JavaScript: Behaviour of the page -->
<script lang="ts">
	// count is reactive - when it changes, the UI automatically updates
	let count = $state(0);
</script>

<!-- HTML: The structure/layout of the page -->
<div class="counter">{count}</div>
<div class="buttons">
	<button onclick={() => count--}>-</button>
	<button onclick={() => (count = 0)}>Reset</button>
	<button onclick={() => count++}>+</button>
</div>

<!-- CSS: The styling/look of the page -->
<style>
	.counter {
		font-size: 4rem;
		font-weight: bold;
		margin: 2rem 0;
	}

	.buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	button {
		padding: 0.75rem 2rem;
		border: 1px solid black;
		border-radius: 0.5rem;
		cursor: pointer;
	}
</style>
