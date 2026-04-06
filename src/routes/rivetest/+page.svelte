<script lang="ts">
	import { onMount } from 'svelte';

	let logs = $state<{ msg: string; ok: boolean }[]>([]);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let currentRive: { cleanup?: () => void } | null = null;

	function log(msg: string, ok = true) {
		logs = [...logs, { msg, ok }];
	}

	async function tryLoad(opts: {
		src: string;
		artboard?: string;
		sm?: string;
		autoBind?: boolean;
		offscreen?: boolean;
	}): Promise<boolean> {
		currentRive?.cleanup?.();
		const { Rive, Layout, Fit, Alignment } = await import('@rive-app/canvas');

		const desc = `${opts.src.split('/').pop()} | ab=${opts.artboard ?? 'default'} | sm=${opts.sm ?? 'none'} | autoBind=${!!opts.autoBind} | offscreen=${!!opts.offscreen}`;
		log(`▶ ${desc}`);

		return new Promise((resolve) => {
			const r = new Rive({
				src: opts.src,
				canvas: canvasEl!,
				artboard: opts.artboard,
				stateMachines: opts.sm,
				autoplay: true,
				autoBind: opts.autoBind ?? false,
				useOffscreenRenderer: opts.offscreen ?? false,
				layout: new Layout({ fit: Fit.Cover, alignment: Alignment.BottomCenter }),
				onLoad: () => {
					currentRive = r;
					r.resizeDrawingSurfaceToCanvas();
					const ab = r.artboardNames?.join(', ') ?? '(artboardNames not available)';
					const vm = opts.autoBind ? r.viewModelInstance : null;
					log(`  ✓ loaded! artboards=[${ab}] buffer=${canvasEl!.width}×${canvasEl!.height}`);
					if (opts.autoBind) log(`  viewModel=${vm?.name ?? 'null'}`, !!vm);
					resolve(true);
				},
				onLoadError: (e: unknown) => {
					log(`  ✗ ${JSON.stringify(e)}`, false);
					resolve(false);
				}
			});
		});
	}

	onMount(async () => {
		if (!canvasEl) return;

		const gl = canvasEl.getContext('webgl') ?? canvasEl.getContext('webgl2');
		log(`WebGL: ${gl ? (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).VERSION) : 'NOT AVAILABLE'}`, !!gl);
		if (!gl) return;

		for (const path of ['/animations/gonn.riv', '/animations/monster.riv']) {
			const res = await fetch(path);
			log(`${path} → ${res.status}`, res.ok);
		}

		// Step 1 — mirror exact Monster.svelte config (this is known to work on homepage)
		log('── Step 1: monster.riv with full Monster.svelte config ──');
		await tryLoad({ src: '/animations/monster.riv', artboard: 'artboard1', sm: 'State Machine 1', autoBind: true, offscreen: true });

		// Step 2 — gonn.riv with same config
		log('── Step 2: gonn.riv with same config ──');
		await tryLoad({ src: '/animations/gonn.riv', artboard: 'artboard1', sm: 'State Machine 1', autoBind: true, offscreen: true });

		// Step 3 — gonn.riv bare minimum (helps narrow down if it's artboard name or file format)
		log('── Step 3: gonn.riv bare minimum ──');
		const step3 = await tryLoad({ src: '/animations/gonn.riv' });

		if (step3) {
			// File loads — artboard/SM name is wrong. Probe common names.
			log('── Step 4: probing artboard names in gonn.riv ──');
			for (const ab of ['Artboard', 'artboard', 'artboard1', 'Main', 'Gonn', 'Character', 'Monster']) {
				const ok = await tryLoad({ src: '/animations/gonn.riv', artboard: ab });
				if (ok) { log(`  ✓ correct artboard name = "${ab}"`); break; }
			}
		}
	});
</script>

<svelte:head><title>Rive Debug</title></svelte:head>

<div class="flex h-screen flex-col bg-gray-950 text-white">
	<div class="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
		<a href="/" class="text-sm text-gray-400 hover:text-white">← Home</a>
		<h1 class="font-mono text-sm font-bold">Rive Debug</h1>
	</div>
	<div class="flex flex-1 overflow-hidden">
		<div class="flex shrink-0 flex-col items-center justify-center gap-2 border-r border-gray-800 p-4">
			<p class="font-mono text-xs text-gray-500">400 × 400</p>
			<canvas
				bind:this={canvasEl}
				width="400"
				height="400"
				style="width:400px;height:400px;background:#1a1412;display:block;"
			></canvas>
		</div>
		<div class="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed">
			{#if logs.length === 0}<p class="text-gray-600">Running…</p>{/if}
			{#each logs as e}
				<div class:text-green-400={e.ok} class:text-red-400={!e.ok}>{e.msg}</div>
			{/each}
		</div>
	</div>
</div>
