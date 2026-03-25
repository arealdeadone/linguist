<script lang="ts">
	import { onMount } from 'svelte';
	import type HanziWriter from 'hanzi-writer';
	import type { StrokeData } from 'hanzi-writer';

	let {
		character,
		onComplete
	}: {
		character: string;
		onComplete: (mistakes: number) => void;
	} = $props();

	let containerEl: HTMLDivElement;
	let writer: HanziWriter | null = null;
	let mistakes = $state(0);
	let isComplete = $state(false);
	let showHint = $state(false);
	let currentStroke = $state<number | null>(null);
	let isMounted = $state(false);
	let initToken = 0;

	function getSize() {
		if (typeof window === 'undefined') return 300;
		return window.matchMedia('(min-width: 768px)').matches ? 400 : 300;
	}

	async function startQuiz() {
		if (!writer) return;
		mistakes = 0;
		isComplete = false;
		showHint = false;
		currentStroke = null;

		await writer.quiz({
			showHintAfterMisses: false,
			onMistake: (strokeData: StrokeData) => {
				mistakes = strokeData.totalMistakes;
				currentStroke = strokeData.strokeNum;
				showHint = strokeData.mistakesOnStroke >= 3;
			},
			onCorrectStroke: () => {
				showHint = false;
				currentStroke = null;
			},
			onComplete: (summary: { character: string; totalMistakes: number }) => {
				mistakes = summary.totalMistakes;
				isComplete = true;
				showHint = false;
				onComplete(summary.totalMistakes);
			}
		});
	}

	async function initializeWriter(nextCharacter: string) {
		if (!containerEl || !nextCharacter) return;

		const token = ++initToken;
		const HanziWriterModule = await import('hanzi-writer');
		if (token !== initToken || !containerEl) return;

		writer?.cancelQuiz();
		containerEl.innerHTML = '';

		const size = getSize();
		writer = HanziWriterModule.default.create(containerEl, nextCharacter, {
			width: size,
			height: size,
			padding: 5,
			showOutline: true,
			strokeAnimationSpeed: 1,
			delayBetweenStrokes: 100,
			strokeColor: '#312e81',
			outlineColor: '#e5e7eb',
			drawingColor: '#4f46e5',
			highlightColor: '#818cf8'
		});

		await startQuiz();
	}

	async function handleTryAgain() {
		await initializeWriter(character);
	}

	async function handleShowHint() {
		if (!writer || currentStroke === null) return;
		await writer.highlightStroke(currentStroke);
	}

	function handleResize() {
		if (!writer) return;
		const size = getSize();
		writer.updateDimensions({ width: size, height: size, padding: 5 });
	}

	onMount(() => {
		isMounted = true;
		const onResize = () => handleResize();
		window.addEventListener('resize', onResize);

		return () => {
			isMounted = false;
			window.removeEventListener('resize', onResize);
			writer?.cancelQuiz();
			writer = null;
		};
	});

	$effect(() => {
		if (!isMounted || !containerEl) return;
		const nextCharacter = character;
		void initializeWriter(nextCharacter);
	});
</script>

<div class="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm">
	<div class="mx-auto w-[300px] md:w-[400px]" class:complete={isComplete}>
		<div bind:this={containerEl} class="h-[300px] w-[300px] md:h-[400px] md:w-[400px]"></div>
	</div>

	<div class="mt-4 flex flex-wrap items-center justify-center gap-3">
		<div class="rounded-xl bg-surface-100 px-3 py-2 text-sm text-surface-600">Mistakes: {mistakes}</div>
		{#if showHint && !isComplete}
			<button
				onclick={handleShowHint}
				class="rounded-xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
			>
				Show Hint
			</button>
		{/if}
		<button
			onclick={handleTryAgain}
			class="rounded-xl border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-700 transition-colors hover:bg-surface-50"
		>
			Try Again
		</button>
	</div>

	{#if isComplete}
		<p class="mt-3 text-center text-sm font-medium text-success">Great stroke order! ✅</p>
	{/if}
</div>

<style>
	.complete {
		animation: writer-success 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}

	@keyframes writer-success {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.04);
		}
		100% {
			transform: scale(1);
		}
	}
</style>
