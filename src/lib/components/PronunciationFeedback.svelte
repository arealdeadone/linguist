<script lang="ts">
	import { fade, fly } from 'svelte/transition';

	interface PronunciationCorrection {
		word: string;
		expected: string;
		got: string;
		issue: string;
	}

	interface ToneError {
		expected: string;
		got: string;
		pinyin: string;
		expectedTone: number;
		actualTone: number;
	}

	export interface PronunciationEvaluation {
		score: number;
		correct: boolean;
		feedback: string;
		corrections: PronunciationCorrection[];
		toneErrors?: ToneError[];
	}

	let { evaluation }: { evaluation: PronunciationEvaluation } = $props();

	function scorePalette(score: number): string {
		if (score >= 80) return 'bg-success/15 text-success border-success/30';
		if (score >= 50) return 'bg-warning/15 text-warning border-warning/35';
		return 'bg-error/15 text-error border-error/35';
	}

	const toneMarks: Record<number, string> = {
		1: 'ā',
		2: 'á',
		3: 'ǎ',
		4: 'à',
		5: 'a'
	};
</script>

<section class="space-y-4" in:fade={{ duration: 220 }}>
	<div class="flex items-start gap-4 rounded-2xl border border-surface-200 bg-white p-4 shadow-sm" in:fly={{ y: 8, duration: 220 }}>
		<div
			class="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border text-2xl font-bold {scorePalette(
				evaluation.score
			)}"
		>
			{evaluation.score}
		</div>
		<div class="min-w-0 flex-1">
			<p class="text-xs font-semibold uppercase tracking-wide text-surface-400">Feedback</p>
			<p class="mt-1 text-sm leading-relaxed text-surface-700">{evaluation.feedback}</p>
		</div>
	</div>

	{#if evaluation.corrections.length > 0}
		<div class="space-y-2" in:fly={{ y: 8, duration: 240 }}>
			<p class="text-xs font-semibold uppercase tracking-wide text-surface-400">Corrections</p>
			{#each evaluation.corrections as correction, index}
				<article
					class="rounded-xl border border-surface-200 bg-surface-50 p-3"
					in:fade={{ delay: index * 50, duration: 180 }}
				>
					<div class="grid grid-cols-2 gap-3 text-sm">
						<div>
							<p class="text-xs font-medium uppercase tracking-wide text-success/80">Expected</p>
							<p class="mt-1 font-medium text-success">{correction.expected}</p>
						</div>
						<div>
							<p class="text-xs font-medium uppercase tracking-wide text-error/80">Got</p>
							<p class="mt-1 font-medium text-error">{correction.got}</p>
						</div>
					</div>
					<p class="mt-2 text-sm text-surface-600">{correction.issue}</p>
				</article>
			{/each}
		</div>
	{/if}

	{#if evaluation.toneErrors && evaluation.toneErrors.length > 0}
		<div class="space-y-2 rounded-2xl border border-primary-200 bg-primary-50/70 p-3" in:fly={{ y: 8, duration: 260 }}>
			<p class="text-xs font-semibold uppercase tracking-wide text-primary-600">Tone Errors</p>
			{#each evaluation.toneErrors as toneError, index}
				<div class="rounded-xl border border-primary-100 bg-white/80 p-3" in:fade={{ delay: index * 50, duration: 180 }}>
					<div class="flex flex-wrap items-center gap-2 text-sm">
						<span class="rounded-md bg-success/15 px-2 py-1 font-medium text-success">{toneError.expected}</span>
						<span class="text-surface-400">→</span>
						<span class="rounded-md bg-error/15 px-2 py-1 font-medium text-error">{toneError.got}</span>
						<span class="rounded-md bg-primary-100 px-2 py-1 font-medium text-primary-700">{toneError.pinyin}</span>
					</div>
					<p class="mt-2 text-sm text-surface-700">
						Expected tone
						<span class="font-semibold text-success">{toneError.expectedTone} ({toneMarks[toneError.expectedTone]})</span>
						,
						actual tone
						<span class="font-semibold text-error">{toneError.actualTone} ({toneMarks[toneError.actualTone]})</span>
					</p>
				</div>
			{/each}
		</div>
	{/if}
</section>
