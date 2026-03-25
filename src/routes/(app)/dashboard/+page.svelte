<script lang="ts">
	import AudioPlayer from '$lib/components/AudioPlayer.svelte';

	let { data } = $props();

	const masteryTotal = $derived(data.learning + data.reviewing + data.mastered);
	const masteryPct = $derived({
		learning: masteryTotal > 0 ? (data.learning / masteryTotal) * 100 : 0,
		reviewing: masteryTotal > 0 ? (data.reviewing / masteryTotal) * 100 : 0,
		mastered: masteryTotal > 0 ? (data.mastered / masteryTotal) * 100 : 0
	});

	const circumference = 2 * Math.PI * 40;
	const quizOffset = $derived(circumference - (data.averageQuizScore / 100) * circumference);
</script>

<div class="mx-auto max-w-2xl py-8">
	<div class="mb-8 animate-fade-in">
		<h2 class="font-display text-3xl text-surface-900">Your Progress</h2>
		<p class="mt-1.5 text-surface-500">Track your learning journey</p>
	</div>

	<div class="mb-6 grid grid-cols-2 gap-3 animate-fade-in" style="animation-delay: 0.05s">
		<div class="rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-5 shadow-sm">
			<p class="text-xs font-medium tracking-wide text-primary-400 uppercase">Vocabulary</p>
			<p class="mt-1 font-display text-2xl text-primary-700">{data.totalCards}</p>
			{#if masteryTotal > 0}
				<div class="mt-3 flex h-1.5 overflow-hidden rounded-full bg-surface-100">
					<div
						class="bg-success transition-all duration-700"
						style="width: {masteryPct.mastered}%"
					></div>
					<div
						class="bg-warning transition-all duration-700"
						style="width: {masteryPct.reviewing}%"
					></div>
					<div
						class="bg-error transition-all duration-700"
						style="width: {masteryPct.learning}%"
					></div>
				</div>
			{/if}
		</div>

		<a
			href="/review"
			class="group rounded-2xl border border-accent-100 bg-gradient-to-br from-accent-50 to-white p-5 shadow-sm transition-all hover:border-accent-200 hover:shadow-md"
		>
			<p class="text-xs font-medium tracking-wide text-accent-500 uppercase">Due Today</p>
			<p class="mt-1 font-display text-2xl text-accent-700">{data.dueCount}</p>
			<p class="mt-2 text-xs text-accent-400 transition-colors group-hover:text-accent-600">
				Start review →
			</p>
		</a>

		<div class="rounded-2xl border border-surface-100 bg-gradient-to-br from-surface-50 to-white p-5 shadow-sm">
			<p class="text-xs font-medium tracking-wide text-surface-400 uppercase">Lessons</p>
			<p class="mt-1 font-display text-2xl text-surface-800">
				{data.completedLessons}<span class="text-base text-surface-400">/{data.totalLessons}</span>
			</p>
			{#if data.totalLessons > 0}
				<div class="mt-3 flex h-1.5 overflow-hidden rounded-full bg-surface-100">
					<div
						class="rounded-full bg-primary-400 transition-all duration-700"
						style="width: {(data.completedLessons / data.totalLessons) * 100}%"
					></div>
				</div>
			{/if}
		</div>

		<div class="rounded-2xl border border-surface-100 bg-gradient-to-br from-surface-50 to-white p-5 shadow-sm">
			<p class="text-xs font-medium tracking-wide text-surface-400 uppercase">Conversations</p>
			<p class="mt-1 font-display text-2xl text-surface-800">{data.completedConversations}</p>
			<p class="mt-2 text-xs text-surface-400">completed</p>
		</div>
	</div>

	<div class="mb-6 rounded-2xl border border-surface-100 bg-white p-5 shadow-sm animate-fade-in" style="animation-delay: 0.1s">
		<h3 class="mb-4 text-sm font-semibold tracking-wide text-surface-600 uppercase">Mastery Breakdown</h3>
		{#if masteryTotal > 0}
			<div class="flex h-6 overflow-hidden rounded-xl bg-surface-100">
				<div
					class="flex items-center justify-center bg-success text-xs font-medium text-white transition-all duration-700"
					style="width: {masteryPct.mastered}%"
				>
					{#if masteryPct.mastered > 12}
						{Math.round(masteryPct.mastered)}%
					{/if}
				</div>
				<div
					class="flex items-center justify-center bg-warning text-xs font-medium text-white transition-all duration-700"
					style="width: {masteryPct.reviewing}%"
				>
					{#if masteryPct.reviewing > 12}
						{Math.round(masteryPct.reviewing)}%
					{/if}
				</div>
				<div
					class="flex items-center justify-center bg-error text-xs font-medium text-white transition-all duration-700"
					style="width: {masteryPct.learning}%"
				>
					{#if masteryPct.learning > 12}
						{Math.round(masteryPct.learning)}%
					{/if}
				</div>
			</div>
			<div class="mt-3 flex gap-4 text-xs">
				<div class="flex items-center gap-1.5">
					<span class="inline-block h-2.5 w-2.5 rounded-full bg-success"></span>
					<span class="text-surface-500">Mastered ({data.mastered})</span>
				</div>
				<div class="flex items-center gap-1.5">
					<span class="inline-block h-2.5 w-2.5 rounded-full bg-warning"></span>
					<span class="text-surface-500">Reviewing ({data.reviewing})</span>
				</div>
				<div class="flex items-center gap-1.5">
					<span class="inline-block h-2.5 w-2.5 rounded-full bg-error"></span>
					<span class="text-surface-500">Learning ({data.learning})</span>
				</div>
			</div>
		{:else}
			<p class="text-sm text-surface-400">No vocabulary cards yet. Start a lesson to begin!</p>
		{/if}
	</div>

	<div class="mb-6 rounded-2xl border border-surface-100 bg-white p-5 shadow-sm animate-fade-in" style="animation-delay: 0.15s">
		<h3 class="mb-4 text-sm font-semibold tracking-wide text-surface-600 uppercase">Modality Scores</h3>
		<div class="space-y-4">
			{#each [
				{ label: 'Listening', value: data.modalityAverages.listening, color: 'bg-info' },
				{ label: 'Speaking', value: data.modalityAverages.speaking, color: 'bg-primary-500' },
				{ label: 'Contextual', value: data.modalityAverages.contextual, color: 'bg-accent-500' }
			] as modality}
				<div>
					<div class="mb-1.5 flex items-center justify-between">
						<span class="text-sm text-surface-600">{modality.label}</span>
						<span class="text-xs font-medium text-surface-400">{modality.value}/5</span>
					</div>
					<div class="flex h-2.5 overflow-hidden rounded-full bg-surface-100">
						<div
							class="{modality.color} rounded-full transition-all duration-700"
							style="width: {(modality.value / 5) * 100}%"
						></div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<div class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 animate-fade-in" style="animation-delay: 0.2s">
		<div class="flex items-center gap-5 rounded-2xl border border-surface-100 bg-white p-5 shadow-sm">
			<div class="relative flex shrink-0 items-center justify-center">
				<svg class="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
					<circle
						cx="50" cy="50" r="40"
						fill="none"
						stroke="oklch(0.94 0.006 80)"
						stroke-width="8"
					/>
					<circle
						cx="50" cy="50" r="40"
						fill="none"
						stroke="oklch(0.53 0.18 275)"
						stroke-width="8"
						stroke-linecap="round"
						stroke-dasharray={circumference}
						stroke-dashoffset={quizOffset}
						class="transition-all duration-1000"
					/>
				</svg>
				<span class="absolute font-display text-lg text-primary-700">{data.averageQuizScore}%</span>
			</div>
			<div>
				<p class="text-sm font-semibold text-surface-700">Quiz Average</p>
				<p class="mt-0.5 text-xs text-surface-400">{data.totalQuizzes} quiz{data.totalQuizzes === 1 ? '' : 'zes'} taken</p>
			</div>
		</div>

		<a
			href="/review"
			class="group flex items-center gap-4 rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-5 shadow-sm transition-all hover:border-primary-200 hover:shadow-md"
		>
			<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
				<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
			</div>
			<div>
				<p class="font-medium text-surface-900">Start Review</p>
				<p class="text-sm text-surface-400">
					{data.dueCount} card{data.dueCount === 1 ? '' : 's'} waiting
				</p>
			</div>
			<svg class="ml-auto h-5 w-5 text-surface-300 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M9 18l6-6-6-6" />
			</svg>
		</a>
	</div>

	{#if data.weakWords.length > 0}
		<div class="rounded-2xl border border-surface-100 bg-white p-5 shadow-sm animate-fade-in" style="animation-delay: 0.25s">
			<h3 class="mb-4 text-sm font-semibold tracking-wide text-surface-600 uppercase">Words to Focus On</h3>
			<div class="divide-y divide-surface-100">
				{#each data.weakWords as word (word.id)}
					<div class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
						<AudioPlayer text={word.word} size="sm" />
						<div class="min-w-0 flex-1">
							<div class="flex items-baseline gap-2">
								<span class="font-medium text-surface-900">{word.word}</span>
								{#if word.romanization}
									<span class="text-xs text-surface-400">{word.romanization}</span>
								{/if}
							</div>
							{#if word.meaning}
								<p class="truncate text-sm text-surface-500">{word.meaning}</p>
							{/if}
						</div>
						<div class="shrink-0 rounded-lg bg-error/10 px-2 py-1 text-xs font-medium text-error">
							EF {word.ef}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	@keyframes fade-in {
		from { opacity: 0; transform: translateY(8px); }
		to { opacity: 1; transform: translateY(0); }
	}
	.animate-fade-in {
		animation: fade-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
</style>
