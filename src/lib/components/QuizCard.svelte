<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { Snippet } from 'svelte';

	let {
		question,
		currentIndex,
		totalQuestions,
		isCorrect = null,
		feedback = '',
		children
	}: {
		question: string;
		currentIndex: number;
		totalQuestions: number;
		isCorrect?: boolean | null;
		feedback?: string;
		children: Snippet;
	} = $props();

	let progress = $derived((currentIndex + 1) / totalQuestions);
</script>

<div
	class="rounded-2xl border border-surface-200 bg-white shadow-sm"
	in:fly={{ y: 20, duration: 250 }}
>
	<div class="px-5 pt-4">
		<div class="flex items-center justify-between text-xs text-surface-400">
			<span>Question {currentIndex + 1} of {totalQuestions}</span>
			<span>{Math.round(progress * 100)}%</span>
		</div>
		<div class="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-200">
			<div
				class="h-full rounded-full bg-primary-500 transition-all duration-500"
				style="width: {progress * 100}%"
			></div>
		</div>
	</div>

	<div class="px-5 pt-4 pb-2">
		<p class="font-display text-lg text-surface-900">{question}</p>
	</div>

	<div class="px-5 pb-5">
		{@render children()}
	</div>

	{#if isCorrect !== null}
		<div
			class="border-t px-5 py-3 transition-colors duration-300
				{isCorrect ? 'border-success/20 bg-success/5' : 'border-amber-200 bg-amber-50'}"
			in:fly={{ y: 10, duration: 200 }}
		>
			<div class="flex items-center gap-2">
				{#if isCorrect}
					<svg
						class="h-4.5 w-4.5 text-success"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="20 6 9 17 4 12" />
					</svg>
					<span class="text-sm font-medium text-success">Correct!</span>
				{:else}
					<span class="text-lg">💡</span>
					<span class="text-sm font-medium text-amber-700">Not quite</span>
				{/if}
				{#if feedback}
					<span class="text-sm text-surface-500">— {feedback}</span>
				{/if}
			</div>
		</div>
	{/if}
</div>
