<script lang="ts">
	import AudioPlayer from './AudioPlayer.svelte';

	let {
		expectedWord,
		romanization,
		meaning,
		onComplete
	}: {
		expectedWord: string;
		romanization?: string;
		meaning?: string;
		onComplete: (correct: boolean) => void;
	} = $props();

	let userInput = $state('');
	let isSubmitted = $state(false);
	let showHint = $state(false);

	let isCorrect = $derived(
		userInput.trim().normalize('NFC') === expectedWord.trim().normalize('NFC')
	);

	function submit() {
		if (!userInput.trim() || isSubmitted) return;
		isSubmitted = true;
	}

	function next() {
		onComplete(isCorrect);
		userInput = '';
		isSubmitted = false;
		showHint = false;
	}

	function retry() {
		userInput = '';
		isSubmitted = false;
	}
</script>

<div class="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
	<div class="mb-4 flex items-center justify-center gap-3">
		<p class="text-center text-4xl font-bold text-gray-900">{expectedWord}</p>
		<AudioPlayer text={expectedWord} size="md" />
	</div>

	{#if meaning}
		<p class="mb-4 text-center text-lg text-gray-600">{meaning}</p>
	{/if}

	{#if !isSubmitted}
		<div class="space-y-3">
			<input
				type="text"
				bind:value={userInput}
				placeholder="Type the word..."
				class="w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-2xl focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
				onkeydown={(e) => e.key === 'Enter' && submit()}
			/>
			<div class="flex gap-3">
				<button
					onclick={submit}
					disabled={!userInput.trim()}
					class="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white transition-all hover:bg-indigo-700 disabled:opacity-40"
				>
					Check
				</button>
				<button
					onclick={() => (showHint = true)}
					class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
				>
					Hint
				</button>
			</div>
			{#if showHint && romanization}
				<p class="text-center text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">💡 {romanization}</p>
			{/if}
		</div>
	{:else}
		<div class="space-y-3">
			{#if isCorrect}
				<div class="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
					<p class="font-medium text-green-700">✓ Correct!</p>
				</div>
			{:else}
				<div class="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
					<p class="font-medium text-red-700">✗ Not quite</p>
					<p class="mt-1 text-sm text-red-600">Expected: <strong>{expectedWord}</strong></p>
					<p class="text-sm text-red-500">You typed: {userInput}</p>
				</div>
			{/if}
			<div class="flex gap-3">
				{#if !isCorrect}
					<button onclick={retry} class="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 font-medium text-gray-600 hover:bg-gray-50">Try Again</button>
				{/if}
				<button onclick={next} class="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700">Next</button>
			</div>
		</div>
	{/if}
</div>
