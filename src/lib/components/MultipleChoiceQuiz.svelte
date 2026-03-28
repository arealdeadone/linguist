<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import QuizCard from './QuizCard.svelte';
	import AudioPlayer from './AudioPlayer.svelte';

	type QuizModality = 'listen_to_meaning' | 'read_to_meaning' | 'meaning_to_word' | 'fill_blank';

	interface QuestionOption {
		text: string;
		audio_text?: string;
	}

	interface Question {
		word: string;
		romanization: string;
		meaning: string;
		question_text: string;
		question_audio?: string;
		audio_text: string;
		options: QuestionOption[];
		correct_index: number;
		quiz_modality: QuizModality;
	}

	let {
		questions,
		getAudioUrl,
		onComplete
	}: {
		questions: Question[];
		getAudioUrl?: (word: string) => string | undefined;
		onComplete: (answers: Array<{ word: string; correct: boolean }>) => void;
	} = $props();

	let currentIndex = $state(0);
	let selectedOption = $state<number | null>(null);
	let showFeedback = $state(false);
	let answers = $state<Array<{ word: string; correct: boolean }>>([]);
	let isFinished = $state(false);

	let currentQuestion = $derived(questions[currentIndex]);
	let isCorrect = $derived(
		selectedOption !== null && currentQuestion
			? selectedOption === currentQuestion.correct_index
			: null
	);
	let score = $derived(answers.filter((a) => a.correct).length);

	$effect(() => {
		if (!currentQuestion || currentQuestion.quiz_modality !== 'listen_to_meaning') return;
		const timer = setTimeout(() => {
			document
				.querySelector<HTMLButtonElement>(`[data-autoplay-key="${currentIndex}"] button`)
				?.click();
		}, 100);
		return () => clearTimeout(timer);
	});

	function selectOption(index: number) {
		if (showFeedback) return;
		selectedOption = index;
		showFeedback = true;
		answers = [
			...answers,
			{
				word: currentQuestion.word,
				correct: index === currentQuestion.correct_index
			}
		];
	}

	function nextQuestion() {
		if (currentIndex < questions.length - 1) {
			currentIndex += 1;
			selectedOption = null;
			showFeedback = false;
		} else {
			isFinished = true;
			onComplete(answers);
		}
	}

	function optionClass(index: number): string {
		const base =
			'rounded-xl p-4 border-2 text-left text-sm font-medium transition-all duration-200 min-h-[3rem] active:scale-[0.98] flex items-center justify-between gap-3';

		if (!showFeedback) {
			return `${base} border-surface-200 text-surface-700 hover:border-primary-300 hover:bg-primary-50`;
		}

		if (index === currentQuestion.correct_index) {
			return `${base} border-success bg-success/5 text-success`;
		}

		if (index === selectedOption && index !== currentQuestion.correct_index) {
			return `${base} border-amber-400 bg-amber-50 text-amber-700`;
		}

		return `${base} border-surface-200 text-surface-400`;
	}

	function shouldShowOptionAudio(question: Question): boolean {
		return question.quiz_modality === 'meaning_to_word' || question.quiz_modality === 'fill_blank';
	}
</script>

<div class="mx-auto max-w-lg">
	{#if isFinished}
		<div
			class="rounded-2xl border border-surface-200 bg-white p-6 text-center shadow-sm"
			in:fade={{ duration: 300 }}
		>
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full {score >=
				questions.length * 0.7
					? 'bg-success/10'
					: 'bg-accent-100'}"
			>
				<span class="text-2xl">{score >= questions.length * 0.7 ? '🎉' : '💪'}</span>
			</div>
			<h3 class="font-display text-2xl text-surface-900">
				{score >= questions.length * 0.7 ? 'Great Job!' : 'Keep Practicing!'}
			</h3>
			<p class="mt-2 text-surface-500">
				You got <span class="font-semibold text-primary-600">{score}</span> out of
				<span class="font-semibold">{questions.length}</span> correct
			</p>

			<div class="mt-5 h-2 overflow-hidden rounded-full bg-surface-200">
				<div
					class="h-full rounded-full transition-all duration-700 {score >= questions.length * 0.7
						? 'bg-success'
						: 'bg-accent-500'}"
					style="width: {(score / questions.length) * 100}%"
				></div>
			</div>

			<div class="mt-6 space-y-2">
				{#each answers as answer, i}
					<div
						class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm {answer.correct
							? 'bg-success/5'
							: 'bg-amber-50'}"
					>
						{#if answer.correct}
							<svg
								class="h-4 w-4 shrink-0 text-success"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<polyline points="20 6 9 17 4 12" />
							</svg>
						{:else}
							<span class="text-lg">🔄</span>
						{/if}
						<span class={answer.correct ? 'text-success' : 'text-amber-700'}>{answer.word}</span>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		{#key currentIndex}
			<div in:fly={{ x: 30, duration: 200 }} out:fade={{ duration: 100 }}>
				<QuizCard
					question={currentQuestion.question_text}
					{currentIndex}
					totalQuestions={questions.length}
					isCorrect={showFeedback ? isCorrect : null}
					feedback={showFeedback && !isCorrect
						? `The answer is: ${currentQuestion.options[currentQuestion.correct_index]?.text ?? ''}`
						: ''}
				>
					<div class="mb-4 rounded-xl bg-surface-50 p-4">
						{#if currentQuestion.quiz_modality === 'listen_to_meaning'}
							<div class="text-center">
								<p class="mb-3 text-sm text-surface-500">Listen and choose the correct meaning</p>
								<div class="flex justify-center">
									<div data-autoplay-key={currentIndex}>
										<AudioPlayer
											text={currentQuestion.question_audio ??
												currentQuestion.audio_text ??
												currentQuestion.word}
											audioUrl={getAudioUrl?.(currentQuestion.word)}
											size="lg"
										/>
									</div>
								</div>
							</div>
						{:else if currentQuestion.quiz_modality === 'read_to_meaning'}
							<div class="flex items-center gap-3">
								<AudioPlayer
									text={currentQuestion.audio_text ?? currentQuestion.word}
									audioUrl={getAudioUrl?.(currentQuestion.word)}
									size="md"
								/>
								<div>
									<p class="text-xl font-semibold text-surface-900">{currentQuestion.word}</p>
									{#if currentQuestion.romanization}
										<p class="text-sm text-primary-600">{currentQuestion.romanization}</p>
									{/if}
								</div>
							</div>
						{:else if currentQuestion.quiz_modality === 'meaning_to_word'}
							<div>
								<p class="text-xs uppercase tracking-wide text-surface-400">Meaning</p>
								<p class="text-lg font-medium text-surface-800">{currentQuestion.question_text}</p>
							</div>
						{:else if currentQuestion.quiz_modality === 'fill_blank'}
							<div>
								<p class="text-xs uppercase tracking-wide text-surface-400">Fill in the blank</p>
								<p class="text-lg font-medium text-surface-800">{currentQuestion.question_text}</p>
							</div>
						{/if}
					</div>

					<div class="grid grid-cols-2 gap-3">
						{#each currentQuestion.options as option, i}
							<button
								onclick={() => selectOption(i)}
								disabled={showFeedback}
								class={optionClass(i)}
							>
								<span>{option.text}</span>
								{#if shouldShowOptionAudio(currentQuestion) && option.audio_text}
									<AudioPlayer text={option.audio_text} size="sm" />
								{/if}
							</button>
						{/each}
					</div>

					{#if showFeedback}
						<button
							onclick={nextQuestion}
							class="mt-4 w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-700 active:scale-[0.98]"
							in:fly={{ y: 10, duration: 200 }}
						>
							{currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
						</button>
					{/if}
				</QuizCard>
			</div>
		{/key}
	{/if}
</div>
