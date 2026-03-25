<script lang="ts">
	import type { ConversationAnalysis } from '$lib/types/conversation';

	let { analysis, onDismiss }: { analysis: ConversationAnalysis; onDismiss: () => void } = $props();
</script>

<div class="space-y-4">
	<h3 class="font-display text-xl text-gray-900">Session Summary</h3>

	{#if analysis.words_used_correctly.length > 0}
		<div class="rounded-2xl border border-green-100 bg-green-50 p-4">
			<p class="text-xs font-medium uppercase tracking-wider text-green-600 mb-2">Words Used Correctly</p>
			<div class="flex flex-wrap gap-2">
				{#each analysis.words_used_correctly as word}
					<span class="rounded-lg bg-green-100 px-3 py-1 text-sm font-medium text-green-800">{word}</span>
				{/each}
			</div>
		</div>
	{/if}

	{#if analysis.words_used_incorrectly.length > 0}
		<div class="rounded-2xl border border-red-100 bg-red-50 p-4">
			<p class="text-xs font-medium uppercase tracking-wider text-red-600 mb-2">Corrections</p>
			<div class="space-y-2">
				{#each analysis.words_used_incorrectly as err}
					<div class="rounded-xl bg-white p-3 border border-red-100">
						<p class="font-medium text-red-800">{err.word}</p>
						<p class="text-sm text-red-600">{err.error} → {err.correction}</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if analysis.code_switches.length > 0}
		<div class="rounded-2xl border border-amber-100 bg-amber-50 p-4">
			<p class="text-xs font-medium uppercase tracking-wider text-amber-600 mb-2">Code Switches</p>
			<div class="space-y-2">
				{#each analysis.code_switches as cs}
					<div class="flex items-center gap-2 text-sm">
						<span class="text-amber-800 font-medium">{cs.gap_word}</span>
						<span class="text-amber-400">→</span>
						<span class="text-amber-700">{cs.target_equivalent ?? '?'}</span>
						<span class="text-amber-400 text-xs">({cs.times_used}x)</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if analysis.suggested_focus_next_session}
		<div class="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
			<p class="text-xs font-medium uppercase tracking-wider text-indigo-600 mb-1">Focus Next Time</p>
			<p class="text-sm text-indigo-800">{analysis.suggested_focus_next_session}</p>
		</div>
	{/if}

	<button
		onclick={onDismiss}
		class="w-full rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700 transition-all"
	>
		Back to Scenarios
	</button>
</div>
