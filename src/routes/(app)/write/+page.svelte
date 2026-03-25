<script lang="ts">
	import { goto } from '$app/navigation';
	import CharacterWriter from '$lib/components/CharacterWriter.svelte';
	import TextInput from '$lib/components/TextInput.svelte';
	import AudioPlayer from '$lib/components/AudioPlayer.svelte';
	import { showToast } from '$lib/stores/toast.svelte';

	let { data } = $props();

	interface VocabCard {
		id: string;
		word: string;
		romanization: string | null;
		meaning: string | null;
		cefrLevel: string;
	}

	const learner = data.learner as { targetLanguage: string };
	const isChinese = learner.targetLanguage === 'zh';
	let cards = $state<VocabCard[]>(data.dueCards as VocabCard[]);
	let currentIndex = $state(0);
	let isComplete = $state(false);
	let results = $state<Array<{ word: string; quality: number }>>([]);

	const currentCard = $derived(currentIndex < cards.length ? cards[currentIndex] : null);
	const progress = $derived(cards.length > 0 ? currentIndex / cards.length : 0);

	async function handleComplete(correct: boolean | number) {
		if (!currentCard) return;

		let quality: number;
		if (typeof correct === 'number') {
			quality = correct === 0 ? 5 : correct <= 2 ? 4 : 3;
		} else {
			quality = correct ? 4 : 1;
		}

		results = [...results, { word: currentCard.word, quality }];

		try {
			await fetch('/api/srs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ vocabId: currentCard.id, quality, modality: 'speaking' })
			});
		} catch {
			showToast('Could not save writing result', 'error');
		}

		if (currentIndex + 1 >= cards.length) {
			isComplete = true;
		} else {
			currentIndex += 1;
		}
	}
</script>

<div class="mx-auto max-w-2xl py-8">
	{#if isComplete}
		<div class="flex flex-col items-center py-16">
			<span class="text-7xl">✍️</span>
			<h2 class="mt-6 font-display text-3xl text-gray-900">Writing Complete!</h2>
			<p class="mt-2 text-gray-500">
				{results.length} word{results.length === 1 ? '' : 's'} practiced
			</p>
			<div class="mt-4 flex gap-3 text-sm">
				<span class="rounded-lg bg-green-50 px-3 py-1.5 text-green-700">
					{results.filter((r) => r.quality >= 4).length} correct
				</span>
				<span class="rounded-lg bg-red-50 px-3 py-1.5 text-red-700">
					{results.filter((r) => r.quality < 3).length} to review
				</span>
			</div>
			<button
				onclick={() => goto('/')}
				class="mt-8 rounded-xl bg-indigo-600 px-8 py-3 font-medium text-white hover:bg-indigo-700 transition-all"
			>
				Back to Dashboard
			</button>
		</div>
	{:else if cards.length === 0}
		<div class="flex flex-col items-center py-16">
			<span class="text-7xl">✨</span>
			<h2 class="mt-6 font-display text-3xl text-gray-900">Nothing to write</h2>
			<p class="mt-2 text-gray-500">No vocabulary due for writing practice.</p>
			<button
				onclick={() => goto('/')}
				class="mt-8 rounded-xl bg-indigo-600 px-8 py-3 font-medium text-white hover:bg-indigo-700"
			>
				Back to Dashboard
			</button>
		</div>
	{:else}
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h2 class="font-display text-2xl text-gray-900">Writing Practice</h2>
				<p class="mt-0.5 text-sm text-gray-400">{currentIndex + 1} / {cards.length}</p>
			</div>
		</div>

		<div class="mb-4 h-1.5 overflow-hidden rounded-full bg-gray-100">
			<div
				class="h-full rounded-full bg-indigo-500 transition-all duration-500"
				style="width: {progress * 100}%"
			></div>
		</div>

		{#if currentCard}
			<div class="mb-4 flex items-center justify-center gap-3">
				<AudioPlayer text={currentCard.word} size="md" />
				{#if currentCard.meaning}
					<span class="text-lg text-gray-600">{currentCard.meaning}</span>
				{/if}
			</div>

			{#if isChinese}
				<CharacterWriter
					character={currentCard.word}
					onComplete={(mistakes) => handleComplete(mistakes)}
				/>
			{:else}
				<TextInput
					expectedWord={currentCard.word}
					romanization={currentCard.romanization ?? undefined}
					meaning={currentCard.meaning ?? undefined}
					onComplete={(correct) => handleComplete(correct)}
				/>
			{/if}
		{/if}
	{/if}
</div>
