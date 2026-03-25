<script lang="ts">
	interface Question {
		sentence: string;
		answer: string;
		hint: string;
		word: string;
	}

	let {
		questions,
		onComplete
	}: {
		questions: Question[];
		onComplete: (answers: Array<{ word: string; correct: boolean }>) => void;
	} = $props();

	let currentIndex = $state(0);
	let userInput = $state('');
	let showFeedback = $state(false);
	let showHint = $state(false);
	let answers = $state<Array<{ word: string; correct: boolean }>>([]);

	let currentQuestion = $derived(questions[currentIndex]);
	let isCorrect = $derived(userInput.trim().toLowerCase() === currentQuestion?.answer?.toLowerCase());
	let progress = $derived((currentIndex + 1) / questions.length);

	function submit() {
		if (!currentQuestion || showFeedback) return;
		showFeedback = true;
		answers = [...answers, { word: currentQuestion.word, correct: isCorrect }];
	}

	function next() {
		showFeedback = false;
		showHint = false;
		userInput = '';

		if (currentIndex + 1 >= questions.length) {
			onComplete(answers);
		} else {
			currentIndex += 1;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between text-sm text-gray-500">
		<span>Question {currentIndex + 1} of {questions.length}</span>
		<div class="h-2 flex-1 mx-4 rounded-full bg-gray-100 overflow-hidden">
			<div class="h-full rounded-full bg-indigo-500 transition-all duration-300" style="width: {progress * 100}%"></div>
		</div>
	</div>

	{#if currentQuestion}
		<div class="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
			<p class="text-lg text-gray-900 leading-relaxed">
				{#each currentQuestion.sentence.split('___') as part, i}
					{part}
					{#if i < currentQuestion.sentence.split('___').length - 1}
						<span class="inline-block min-w-[80px] border-b-2 border-indigo-400 mx-1">
							{#if showFeedback}
								<span class={isCorrect ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
									{userInput || '...'}
								</span>
							{/if}
						</span>
					{/if}
				{/each}
			</p>

			{#if !showFeedback}
				<div class="mt-6 space-y-3">
					<input
						type="text"
						bind:value={userInput}
						placeholder="Type your answer..."
						class="w-full rounded-xl border border-gray-200 px-4 py-3 text-lg focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
							class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition-all hover:bg-gray-50"
						>
							Hint
						</button>
					</div>

					{#if showHint}
						<p class="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">💡 {currentQuestion.hint}</p>
					{/if}
				</div>
			{:else}
				<div class="mt-4 space-y-3">
					{#if isCorrect}
						<div class="rounded-xl bg-green-50 border border-green-200 p-4">
							<p class="font-medium text-green-700">✓ Correct!</p>
						</div>
					{:else}
						<div class="rounded-xl bg-red-50 border border-red-200 p-4">
							<p class="font-medium text-red-700">✗ Not quite</p>
							<p class="mt-1 text-sm text-red-600">Correct answer: <strong>{currentQuestion.answer}</strong></p>
						</div>
					{/if}

					<button
						onclick={next}
						class="w-full rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white transition-all hover:bg-indigo-700"
					>
						{currentIndex + 1 >= questions.length ? 'Finish' : 'Next Question'}
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
