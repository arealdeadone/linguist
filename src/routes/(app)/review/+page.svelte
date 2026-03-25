<script lang="ts">
	import { goto } from '$app/navigation';
	import { playTTS, getRecordingState } from '$lib/stores/audio.svelte';
	import { showToast } from '$lib/stores/toast.svelte';
	import AudioPlayer from '$lib/components/AudioPlayer.svelte';

	let { data } = $props();

	interface VocabCard {
		id: string;
		word: string;
		romanization: string | null;
		meaning: string | null;
		sceneDescription: string | null;
		cefrLevel: string;
		sm2Repetition: number;
		sm2Interval: number;
		sm2Ef: number;
		nextReview: Date;
		modalityScores: { listening: number; speaking: number; contextual: number };
	}

	let cards = $state<VocabCard[]>(data.dueCards as VocabCard[]);
	let currentIndex = $state(0);
	let isRevealed = $state(false);
	let isSubmitting = $state(false);
	let isComplete = $state(false);
	let cardDirection = $state<'enter' | 'exit'>('enter');
	let reviewMode = $state<'due' | 'all'>(cards.length > 0 ? 'due' : 'all');
	let allVocab = $state<VocabCard[]>(data.allVocab as VocabCard[]);

	const totalDue = data.dueCount as number;
	const totalCards = data.totalCards as number;
	const lessonLanguage = data.lessonLanguage as string;

	const audioState = $derived(getRecordingState());

	const currentCard = $derived(currentIndex < cards.length ? cards[currentIndex] : null);
	const progress = $derived(cards.length > 0 ? currentIndex / cards.length : 0);

	const qualityLabelByLanguage: Record<string, [string, string, string, string, string]> = {
		hi: ['फिर से', 'कठिन', 'ठीक', 'आसान', 'बिल्कुल सही'],
		th: ['อีกครั้ง', 'ยาก', 'พอใช้', 'ง่าย', 'เก่งมาก'],
		en: ['Again', 'Hard', 'Good', 'Easy', 'Perfect']
	};

	const qualityLabels = $derived(
		qualityLabelByLanguage[lessonLanguage] ?? qualityLabelByLanguage.en
	);

	const qualityButtons = $derived([
		{
			quality: 1,
			label: qualityLabels[0],
			color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 active:bg-red-200'
		},
		{
			quality: 2,
			label: qualityLabels[1],
			color:
				'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 active:bg-orange-200'
		},
		{
			quality: 3,
			label: qualityLabels[2],
			color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 active:bg-amber-200'
		},
		{
			quality: 4,
			label: qualityLabels[3],
			color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 active:bg-green-200'
		},
		{
			quality: 5,
			label: qualityLabels[4],
			color:
				'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100 active:bg-primary-200'
		}
	]);

	$effect(() => {
		const cardId = currentCard?.id;
		if (!cardId || isComplete) return;

		const timer = setTimeout(() => {
			if (currentCard?.id === cardId) {
				void speakWord();
			}
		}, 250);

		return () => {
			clearTimeout(timer);
		};
	});

	function revealCard() {
		isRevealed = true;
	}

	async function rateCard(quality: number) {
		if (!currentCard || isSubmitting) return;

		isSubmitting = true;

		try {
			await fetch('/api/srs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ vocabId: currentCard.id, quality })
			});
		} catch {
			showToast('Could not save review', 'error');
		}

		isSubmitting = false;
		cardDirection = 'exit';

		await new Promise((resolve) => setTimeout(resolve, 200));

		const nextIdx = currentIndex + 1;
		if (nextIdx >= cards.length) {
			isComplete = true;
		} else {
			currentIndex = nextIdx;
			isRevealed = false;
			cardDirection = 'enter';
		}
	}

	async function speakWord() {
		if (!currentCard) return;
		await playTTS(currentCard.word);
	}

	function handleCardClick() {
		if (!isRevealed) {
			revealCard();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (isComplete) return;

		if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			if (!isRevealed) {
				revealCard();
			}
		}

		if (e.key === 'p' || e.key === 'P') {
			e.preventDefault();
			speakWord();
		}

		if (isRevealed && !isSubmitting) {
			const keyMap: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 };
			const quality = keyMap[e.key];
			if (quality) {
				e.preventDefault();
				rateCard(quality);
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="mx-auto max-w-2xl py-8">
	{#if isComplete}
		<div class="flex flex-col items-center py-16 animate-fade-in">
			<span class="text-7xl">🎉</span>
			<h2 class="mt-6 font-display text-3xl text-surface-900">
				{reviewMode === 'due' ? 'Review Complete!' : 'Practice Complete!'}
			</h2>
			<p class="mt-2 text-surface-500">
				{reviewMode === 'due'
					? 'All due cards reviewed. Great work!'
					: `Practiced all ${totalCards} words.`}
			</p>
			<div class="mt-2 text-sm text-surface-400">
				{totalCards} word{totalCards === 1 ? '' : 's'} in your collection
			</div>
			<div class="mt-6 flex gap-3">
				{#if reviewMode === 'due' && totalCards > 0}
					<button
						onclick={() => {
							cards = [...allVocab];
							reviewMode = 'all';
							currentIndex = 0;
							isComplete = false;
							isRevealed = false;
						}}
						class="rounded-xl border border-primary-200 px-6 py-3 font-medium text-primary-700 transition-all hover:bg-primary-50"
					>
						Practice All Words
					</button>
				{/if}
				<button
					onclick={() => goto('/')}
					class="rounded-xl bg-primary-600 px-8 py-3 font-medium text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md active:scale-95"
				>
					Back to Dashboard
				</button>
			</div>
		</div>
	{:else if cards.length === 0}
		<div class="animate-fade-in space-y-6">
			{#if totalCards > 0}
				<div class="flex flex-col items-center py-8">
					<span class="text-5xl">✅</span>
					<h2 class="mt-4 font-display text-2xl text-surface-900">No cards due right now</h2>
					<p class="mt-1 text-sm text-surface-500">
						{totalCards} word{totalCards === 1 ? '' : 's'} in your collection
					</p>
					<button
						onclick={() => {
							cards = [...allVocab];
							reviewMode = 'all';
							currentIndex = 0;
							isComplete = false;
							isRevealed = false;
						}}
						class="mt-5 rounded-xl bg-primary-600 px-6 py-3 font-medium text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md active:scale-95"
					>
						Practice All {totalCards} Words
					</button>
				</div>

				<div>
					<h3 class="mb-3 text-sm font-medium uppercase tracking-wider text-surface-400">
						Your Vocabulary
					</h3>
					<div class="space-y-2">
						{#each allVocab as vocab}
							<div
								class="flex items-center gap-3 rounded-xl border border-surface-100 bg-white px-4 py-3 shadow-sm"
							>
								<AudioPlayer text={vocab.word} size="sm" />
								<div class="flex-1 min-w-0">
									<div class="flex items-baseline gap-2">
										<span class="text-lg font-medium text-surface-900">{vocab.word}</span>
										{#if vocab.romanization}
											<span class="text-sm text-primary-500">{vocab.romanization}</span>
										{/if}
									</div>
									{#if vocab.meaning}
										<p class="text-sm text-surface-600">{vocab.meaning}</p>
									{/if}
								</div>
								<div class="text-right text-xs text-surface-400">
									<span class="inline-block rounded bg-surface-100 px-1.5 py-0.5"
										>{vocab.cefrLevel}</span
									>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<div class="flex flex-col items-center py-16">
					<span class="text-7xl">📚</span>
					<h2 class="mt-6 font-display text-3xl text-surface-900">No vocabulary yet</h2>
					<p class="mt-2 text-surface-500">
						Complete your first lesson to start building your vocabulary.
					</p>
					<a
						href="/learn"
						class="mt-8 rounded-xl bg-primary-600 px-8 py-3 font-medium text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md active:scale-95"
					>
						Start a Lesson
					</a>
				</div>
			{/if}
		</div>
	{:else}
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h2 class="font-display text-2xl text-surface-900">Review</h2>
				<p class="mt-0.5 text-sm text-surface-400">
					{totalDue} card{totalDue === 1 ? '' : 's'} due · {totalCards} total
				</p>
			</div>
			<div class="rounded-xl bg-surface-100 px-3 py-1.5 text-sm font-medium text-surface-600">
				{currentIndex + 1} / {cards.length}
			</div>
		</div>

		<div class="mb-6 h-1.5 overflow-hidden rounded-full bg-surface-100">
			<div
				class="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500 ease-out"
				style="width: {progress * 100}%"
			></div>
		</div>

		{#if currentCard}
			<div
				class="flashcard-container mb-6"
				class:card-enter={cardDirection === 'enter'}
				class:card-exit={cardDirection === 'exit'}
			>
				<div
					role="button"
					tabindex="0"
					onclick={handleCardClick}
					onkeydown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							handleCardClick();
						}
					}}
					class="w-full cursor-pointer rounded-2xl border border-surface-100 bg-white shadow-sm transition-all duration-200 hover:shadow-md focus:ring-2 focus:ring-primary-100 focus:outline-none
						{isRevealed ? 'border-primary-200' : ''}"
				>
					<div class="flex min-h-[280px] flex-col items-center justify-center p-8">
						<span
							class="mb-3 rounded-md bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600"
						>
							{currentCard.cefrLevel}
						</span>

						<p class="font-display text-5xl leading-tight text-surface-900 sm:text-6xl">
							{currentCard.word}
						</p>

						<button
							onclick={(event) => {
								event.stopPropagation();
								void speakWord();
							}}
							disabled={audioState.isPlaying}
							class="mt-4 inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition-all hover:bg-primary-100 disabled:opacity-50"
						>
							{audioState.isPlaying ? 'Playing…' : 'Listen again'}
							<kbd class="rounded bg-primary-100 px-1.5 py-0.5 text-xs text-primary-500">P</kbd>
						</button>

						{#if isRevealed}
							<div class="mt-6 space-y-3 animate-reveal">
								{#if currentCard.romanization}
									<p class="text-xl text-primary-600">{currentCard.romanization}</p>
								{/if}
								{#if currentCard.meaning}
									<p class="text-2xl font-medium text-surface-800">{currentCard.meaning}</p>
								{/if}
								{#if currentCard.sceneDescription}
									<p
										class="text-sm leading-relaxed text-surface-500 italic border-l-2 border-accent-300 pl-3 text-left max-w-md mx-auto"
									>
										{currentCard.sceneDescription}
									</p>
								{/if}
							</div>
						{:else}
							<p class="mt-6 text-sm text-surface-400">
								Tap or press <kbd
									class="rounded bg-surface-100 px-1.5 py-0.5 text-xs font-mono text-surface-500"
									>Space</kbd
								> to reveal meaning
							</p>
						{/if}
					</div>
				</div>
			</div>

			{#if isRevealed}
				<div class="grid grid-cols-5 gap-2 animate-reveal">
					{#each qualityButtons as btn (btn.quality)}
						<button
							onclick={() => rateCard(btn.quality)}
							disabled={isSubmitting}
							class="flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center font-medium transition-all disabled:opacity-50 active:scale-95 {btn.color}"
						>
							<span class="text-lg">{btn.quality}</span>
							<span class="text-xs">{btn.label}</span>
						</button>
					{/each}
				</div>
				<p class="mt-3 text-center text-xs text-surface-400">
					<kbd class="rounded bg-surface-100 px-1 py-0.5 font-mono text-surface-500">1</kbd>–<kbd
						class="rounded bg-surface-100 px-1 py-0.5 font-mono text-surface-500">5</kbd
					>
					rate · <kbd class="rounded bg-surface-100 px-1 py-0.5 font-mono text-surface-500">P</kbd>
					listen ·
					<kbd class="rounded bg-surface-100 px-1 py-0.5 font-mono text-surface-500">Space</kbd> reveal
				</p>
			{/if}
		{/if}
	{/if}
</div>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@keyframes reveal {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@keyframes card-slide-in {
		from {
			opacity: 0;
			transform: translateX(40px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
	@keyframes card-slide-out {
		from {
			opacity: 1;
			transform: translateX(0);
		}
		to {
			opacity: 0;
			transform: translateX(-40px);
		}
	}
	.animate-fade-in {
		animation: fade-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
	.animate-reveal {
		animation: reveal 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
	.card-enter {
		animation: card-slide-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
	.card-exit {
		animation: card-slide-out 0.2s ease-in both;
	}
</style>
