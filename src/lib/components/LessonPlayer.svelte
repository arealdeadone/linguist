<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import type { LessonPlan, ActivityType, VocabTarget } from '$lib/types/lesson';
	import { selectQuizTypeByCefr } from '$lib/quiz-utils';
	import AudioPlayer from './AudioPlayer.svelte';
	import MultipleChoiceQuiz from './MultipleChoiceQuiz.svelte';
	import FillInBlankQuiz from './FillInBlankQuiz.svelte';
	import { showToast } from '$lib/stores/toast.svelte';

	type QuizType = 'multiple_choice' | 'fill_in_blank';

	interface AdaptiveQuestion {
		word: string;
		romanization: string;
		meaning: string;
		question_text: string;
		question_audio?: string;
		audio_text: string;
		options: Array<{ text: string; audio_text?: string }>;
		correct_index: number;
		quiz_modality: 'listen_to_meaning' | 'read_to_meaning' | 'meaning_to_word' | 'fill_blank';
	}

	interface FillBlankQuestion {
		sentence: string;
		answer: string;
		hint: string;
		word: string;
	}
	import ConversationChat from './ConversationChat.svelte';
	import SpeakingActivity from './SpeakingActivity.svelte';

	let {
		plan,
		lessonId,
		learnerId,
		targetLanguage,
		lessonLanguage,
		allVocab = [],
		initialStep = 0
	}: {
		plan: LessonPlan;
		lessonId: string;
		learnerId: string;
		targetLanguage: string;
		lessonLanguage: string;
		allVocab?: Array<{
			id: string;
			word: string;
			meaning: string | null;
			romanization: string | null;
			sceneDescription: string | null;
			audioUrl?: string | null;
		}>;
		initialStep?: number;
	} = $props();

	let currentIndex = $state(initialStep);
	let totalActivities = $derived(plan.activities.length);
	let currentActivity = $derived(plan.activities[currentIndex]);
	let cefrLevel = $derived(plan.cefr_level);
	let progress = $derived((currentIndex + 1) / totalActivities);
	let isComplete = $state(false);
	let quizData = $state<{ questions: AdaptiveQuestion[] | FillBlankQuestion[] } | null>(null);
	let activeQuizType = $state<QuizType>('multiple_choice');
	let quizLoading = $state(false);
	let quizCompleted = $state(false);
	let errorMessage = $state<string | null>(null);
	let showConversation = $state(false);
	let speakingWordIndex = $state(0);
	let speakingComplete = $state(false);
	let revealedReviewWords = $state<Record<number, boolean>>({});

	const vocabTargets = $derived(
		plan.vocabulary_targets.map((vocab) =>
			typeof vocab === 'string'
				? { word: vocab, romanization: '', meaning: '', scene_description: '' }
				: vocab
		)
	);

	const vocabWords = $derived(vocabTargets.map((vocab) => vocab.word));
	const reviewWords = $derived(Array.isArray(plan.review_words) ? plan.review_words : []);
	const conversationScenario = $derived(
		`Practice a conversation about ${plan.theme}. Use these vocabulary words naturally: ${vocabWords.join(', ')}. The learner knows these words: ${reviewWords.join(', ')}.`
	);
	const currentSpeakingVocab = $derived(vocabTargets[speakingWordIndex] ?? null);
	const vocabLookup = $derived(new Map(allVocab.map((v) => [v.word, v])));
	const reviewWordCards = $derived(
		reviewWords.map((word) => {
			const fromDb = vocabLookup.get(word);
			const fromLesson = vocabTargets.find((v) => v.word === word);
			if (!fromDb?.id) {
				console.error('Review word missing vocabulary ID', { learnerId, lessonId, word });
			}
			return {
				id: fromDb?.id ?? `missing-${word}`,
				word,
				meaning: fromDb?.meaning ?? fromLesson?.meaning ?? word,
				romanization: fromDb?.romanization ?? fromLesson?.romanization ?? word,
				sceneDescription: fromDb?.sceneDescription ?? fromLesson?.scene_description ?? word,
				audioUrl: fromDb?.audioUrl ?? fromLesson?.audioUrl
			};
		})
	);
	const nextDisabled = $derived(
		(currentActivity?.type === 'conversation' && showConversation) ||
			(currentActivity?.type === 'speaking' && !speakingComplete)
	);

	$effect(() => {
		currentIndex;
		showConversation = false;
		speakingWordIndex = 0;
		speakingComplete = false;
		revealedReviewWords = {};
	});

	const activityLabels: Record<ActivityType, { label: string; icon: string; color: string }> = {
		listening: { label: 'Listening', icon: '🎧', color: 'bg-info/10 text-info' },
		vocabulary_tpr: { label: 'Vocabulary', icon: '📝', color: 'bg-accent-100 text-accent-700' },
		conversation: { label: 'Conversation', icon: '💬', color: 'bg-success/10 text-success' },
		srs_review: { label: 'Review', icon: '🔄', color: 'bg-primary-100 text-primary-700' },
		quiz: { label: 'Quiz', icon: '✅', color: 'bg-warning/10 text-warning' },
		speaking: { label: 'Speaking', icon: '🎤', color: 'bg-error/10 text-error' }
	};

	let lessonMarkedComplete = $state(false);

	async function markLessonComplete() {
		if (lessonMarkedComplete) return;
		try {
			const res = await fetch(`/api/lessons/${lessonId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'completed' })
			});
			if (res.ok) {
				lessonMarkedComplete = true;
			} else {
				showToast('Could not mark lesson as completed. Please try again.', 'error');
			}
		} catch {
			showToast('Failed to mark lesson complete', 'error');
		}
	}

	function goNext() {
		if (currentIndex < totalActivities - 1) {
			currentIndex += 1;
		} else {
			isComplete = true;
			markLessonComplete();
		}
	}

	function goPrev() {
		if (currentIndex > 0) {
			currentIndex -= 1;
		}
	}

	function toggleReviewWord(index: number) {
		revealedReviewWords = { ...revealedReviewWords, [index]: !revealedReviewWords[index] };
	}

	async function handleSpeakingComplete(result?: { score: number; correct: boolean }) {
		if (result) {
			const vocab = vocabTargets[speakingWordIndex];
			if (vocab) {
				const quality = result.correct ? (result.score >= 90 ? 5 : 4) : result.score >= 50 ? 2 : 1;
				const match = vocabLookup.get(vocab.word);
				if (match?.id) {
					try {
						await fetch('/api/srs', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ vocabId: match.id, quality, modality: 'speaking' })
						});
					} catch {
						showToast('Could not save speaking result', 'error');
					}
				}
			}
		}
		if (speakingWordIndex < vocabTargets.length - 1) {
			speakingWordIndex += 1;
			return;
		}
		speakingComplete = true;
	}

	async function startQuiz() {
		const quizType = selectQuizTypeByCefr(cefrLevel);
		activeQuizType = quizType;

		if (plan.preGeneratedQuiz && plan.preGeneratedQuiz.quizType === quizType) {
			quizData = plan.preGeneratedQuiz as { questions: AdaptiveQuestion[] | FillBlankQuestion[] };
			quizLoading = false;
			quizCompleted = false;
			errorMessage = null;
			if (isComplete) {
				isComplete = false;
				currentIndex = totalActivities;
			}
			return;
		}

		quizLoading = true;
		quizData = null;
		quizCompleted = false;
		errorMessage = null;
		try {
			const res = await fetch('/api/quiz', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ learnerId, lessonId, quizType, cefrLevel })
			});
			if (res.ok) {
				const data = await res.json();
				if (data.questions && data.questions.length > 0) {
					quizData = data;
					if (isComplete) {
						isComplete = false;
						currentIndex = totalActivities;
					}
				} else {
					errorMessage = 'Quiz generated but no questions were returned. Try again.';
					showToast(
						errorMessage ?? 'Quiz generated but no questions were returned. Try again.',
						'error'
					);
				}
			} else {
				let parsedError = 'Failed to generate quiz';
				try {
					const err = (await res.json()) as { error?: string };
					if (typeof err.error === 'string' && err.error.trim().length > 0) {
						parsedError = err.error;
					}
				} catch {
					parsedError = 'Failed to generate quiz';
				}
				errorMessage = parsedError;
				showToast(errorMessage ?? 'Failed to generate quiz', 'error');
			}
		} catch {
			errorMessage = 'Network error generating quiz. Please try again.';
			showToast(errorMessage ?? 'Network error generating quiz. Please try again.', 'error');
		}
		quizLoading = false;
	}

	async function handleQuizComplete(answers: Array<{ word: string; correct: boolean }>) {
		quizCompleted = true;
		const score = (answers.filter((a) => a.correct).length / answers.length) * 100;
		await fetch('/api/quiz/submit', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				learnerId,
				lessonId,
				quizType: activeQuizType,
				questions: quizData?.questions,
				answers,
				score
			})
		}).catch(() => {
			showToast('Could not submit quiz results', 'error');
		});
		await markLessonComplete();
	}

</script>

<div class="mx-auto flex min-h-[calc(100vh-10rem)] max-w-2xl flex-col py-4">
	{#if errorMessage}
		<div class="fixed top-20 left-1/2 z-50 -translate-x-1/2 animate-fade-in">
			<div
				class="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 shadow-lg"
			>
				<svg
					class="h-5 w-5 shrink-0 text-red-500"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="10" />
					<line x1="15" y1="9" x2="9" y2="15" />
					<line x1="9" y1="9" x2="15" y2="15" />
				</svg>
				<p class="text-sm text-red-700">{errorMessage}</p>
			</div>
		</div>
	{/if}

	{#if quizData && !quizCompleted}
		<div class="mb-4">
			<button
				onclick={() => {
					quizData = null;
					if (currentIndex >= totalActivities) isComplete = true;
				}}
				class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
			>
				<svg
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M19 12H5M12 19l-7-7 7-7" />
				</svg>
				Back
			</button>
		</div>
		{#if activeQuizType === 'multiple_choice'}
			<MultipleChoiceQuiz
				questions={quizData.questions as AdaptiveQuestion[]}
				onComplete={handleQuizComplete}
			/>
		{:else}
			<FillInBlankQuiz
				questions={quizData.questions as FillBlankQuestion[]}
				onComplete={handleQuizComplete}
			/>
		{/if}
	{:else if quizCompleted}
		<div class="flex flex-1 flex-col items-center justify-center px-4" in:fade={{ duration: 300 }}>
			<div class="rounded-2xl border border-surface-200 bg-white p-8 text-center shadow-sm">
				<div
					class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10"
				>
					<svg
						class="h-7 w-7 text-success"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="20 6 9 17 4 12" />
					</svg>
				</div>
				<h3 class="font-display text-xl text-surface-900">Quiz Complete!</h3>
				<p class="mt-2 text-surface-500">Your SRS scores have been updated.</p>
				<div class="mt-6 flex gap-3">
					<a
						href="/learn"
						class="flex-1 rounded-xl border border-surface-200 px-4 py-3 text-sm font-medium text-surface-600 hover:bg-surface-50"
					>
						Next Lesson
					</a>
					<a
						href="/review"
						class="flex-1 rounded-xl bg-primary-600 px-4 py-3 text-sm font-medium text-white hover:bg-primary-700"
					>
						Review Cards
					</a>
				</div>
			</div>
		</div>
	{:else if isComplete}
		<div class="flex flex-1 flex-col items-center justify-center px-4" in:fade={{ duration: 300 }}>
			<div class="rounded-2xl border border-surface-200 bg-white p-8 text-center shadow-sm">
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10"
				>
					<svg
						class="h-8 w-8 text-success"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="20 6 9 17 4 12" />
					</svg>
				</div>
				<h2 class="font-display text-2xl text-surface-900">Lesson Complete!</h2>
				<p class="mt-2 text-surface-500">
					Great work on today's lesson about <span class="font-medium text-primary-600"
						>{plan.theme}</span
					>
				</p>

				<div class="mt-6 grid grid-cols-2 gap-3">
					<div class="rounded-xl bg-primary-50 px-4 py-3">
						<p class="text-2xl font-semibold text-primary-700">{plan.vocabulary_targets.length}</p>
						<p class="text-xs text-primary-500">Words learned</p>
					</div>
					<div class="rounded-xl bg-accent-50 px-4 py-3">
						<p class="text-2xl font-semibold text-accent-700">{totalActivities}</p>
						<p class="text-xs text-accent-600">Activities done</p>
					</div>
				</div>

				{#if plan.vocabulary_targets.length > 0}
					<div class="mt-5 text-left">
						<p class="mb-2 text-xs font-medium uppercase tracking-wider text-surface-400">
							Vocabulary
						</p>
						<div class="flex flex-wrap gap-2">
							{#each plan.vocabulary_targets as vocab}
								{@const v =
									typeof vocab === 'string'
										? { word: vocab, meaning: '', audioUrl: undefined }
										: vocab}
								<span
									class="inline-flex items-center gap-1.5 rounded-lg bg-surface-100 px-3 py-1.5 text-sm text-surface-700"
								>
									{v.word}
									{#if v.meaning}
										<span class="text-surface-400">— {v.meaning}</span>
									{/if}
									<AudioPlayer
										text={v.word}
										language={targetLanguage}
										audioUrl={v.audioUrl}
										size="sm"
									/>
								</span>
							{/each}
						</div>
					</div>
				{/if}

				<div class="mt-6 flex flex-col gap-3">
					<button
						onclick={startQuiz}
						disabled={quizLoading}
						class="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50"
					>
						{quizLoading ? 'Generating...' : 'Take Quiz'}
					</button>
					<a
						href="/review"
						class="w-full rounded-xl border border-surface-200 px-4 py-3 text-sm font-medium text-surface-700 transition-all hover:bg-surface-50"
					>
						Review Cards
					</a>
					<a
						href="/learn"
						class="w-full rounded-xl border border-surface-200 px-4 py-3 text-sm font-medium text-surface-600 transition-all hover:bg-surface-50"
					>
						Back to Lessons
					</a>
				</div>
			</div>
		</div>
	{:else}
		<!-- Progress bar -->
		<div class="mb-6 px-1">
			<div class="flex items-center justify-between text-xs text-surface-400">
				<span>{currentIndex + 1} of {totalActivities}</span>
				<span>{Math.round(progress * 100)}%</span>
			</div>
			<div class="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-200">
				<div
					class="h-full rounded-full bg-primary-500 transition-all duration-500"
					style="width: {progress * 100}%"
				></div>
			</div>
		</div>

		<!-- Activity badge -->
		{#if currentActivity}
			{@const meta = activityLabels[currentActivity.type]}
			<div class="mb-4 px-1">
				<span
					class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium {meta.color}"
				>
					<span>{meta.icon}</span>
					{meta.label}
					<span class="text-surface-300">·</span>
					<span class="text-surface-400">{currentActivity.duration_min} min</span>
				</span>
			</div>
		{/if}

		<!-- Activity content -->
		<div class="flex-1 px-1">
			{#key currentIndex}
				<div in:fly={{ x: 40, duration: 250 }} out:fade={{ duration: 120 }}>
					{#if currentActivity?.type === 'listening'}
						<div class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
							<h3 class="font-display text-xl text-surface-900">{plan.theme}</h3>

							{#if plan.vocabulary_targets.length > 0}
								<div class="mt-5 space-y-3">
									{#each plan.vocabulary_targets as vocab}
											{@const v =
												typeof vocab === 'string'
													? { word: vocab, romanization: '', meaning: '', audioUrl: undefined }
													: vocab}
										<div class="flex items-center gap-3 rounded-xl bg-surface-50 px-4 py-3">
											<AudioPlayer
												text={v.word}
												language={targetLanguage}
												audioUrl={v.audioUrl}
												size="md"
											/>
											<span class="text-lg font-medium text-surface-800">{v.word}</span>
											{#if v.romanization}
												<span class="text-sm text-primary-500">{v.romanization}</span>
											{/if}
											{#if v.meaning}
												<span class="ml-auto text-sm text-surface-500">{v.meaning}</span>
											{/if}
										</div>
									{/each}
								</div>
							{/if}

							{#if plan.cultural_note}
								<div class="mt-5 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3">
									<p class="text-xs font-medium uppercase tracking-wider text-accent-600">🌍</p>
									<p class="mt-1 text-sm text-accent-700">{plan.cultural_note}</p>
								</div>
							{/if}
						</div>
					{:else if currentActivity?.type === 'vocabulary_tpr'}
						<div class="space-y-4">
							{#each plan.vocabulary_targets as vocab}
								{@const v =
									typeof vocab === 'string'
										? { word: vocab, romanization: '', meaning: '', scene_description: '' }
										: (vocab as VocabTarget)}
								<div class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
									<div class="flex items-start gap-4">
										<AudioPlayer
											text={v.word}
											language={targetLanguage}
											audioUrl={v.audioUrl}
											size="lg"
										/>
										<div class="flex-1">
											<p class="font-display text-3xl text-surface-900">{v.word}</p>
											{#if v.romanization}
												<p class="mt-1 text-base text-primary-600">{v.romanization}</p>
											{/if}
											{#if v.meaning}
												<p class="mt-2 text-lg font-medium text-surface-700">{v.meaning}</p>
											{/if}
											{#if v.scene_description}
												<p
													class="mt-2 text-sm leading-relaxed text-surface-500 italic border-l-2 border-accent-300 pl-3"
												>
													{v.scene_description}
												</p>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else if currentActivity?.type === 'conversation'}
						<div class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
							<div
								class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10"
							>
								<svg
									class="h-7 w-7 text-success"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path
										d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
									/>
								</svg>
							</div>
							<h3 class="font-display text-xl text-surface-900">Conversation Practice</h3>
							<p class="mt-2 text-surface-500">
								Practice a conversation about <span class="font-medium text-primary-600"
									>{plan.theme}</span
								>
							</p>
							{#if plan.colloquial_phrase}
								<div class="mt-4 rounded-xl bg-primary-50 px-4 py-3">
									<p class="text-xs font-medium uppercase tracking-wider text-primary-500">
										Phrase of the Day
									</p>
									<p class="mt-1 text-lg font-medium text-primary-700">{plan.colloquial_phrase}</p>
									<AudioPlayer
										text={plan.colloquial_phrase}
										language={targetLanguage}
										audioUrl={plan.colloquial_phrase_audio_url}
										size="sm"
									/>
								</div>
							{/if}

							{#if !showConversation}
								<button
									onclick={() => (showConversation = true)}
									class="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-success/10 px-4 py-3.5 text-sm font-medium text-success transition-all hover:bg-success/15 active:scale-[0.98]"
								>
									Start Conversation
								</button>
							{:else}
								<div class="mt-5 space-y-3">
									<div class="h-[28rem] overflow-hidden rounded-xl border border-surface-200">
										<ConversationChat
											{learnerId}
											{targetLanguage}
											scenario={conversationScenario}
											onSessionEnd={() => {
												showConversation = false;
											}}
										/>
									</div>
									<button
										onclick={() => (showConversation = false)}
										class="w-full rounded-xl border border-surface-200 px-4 py-3 text-sm font-medium text-surface-700 transition-all hover:bg-surface-50"
									>
										Done Conversing
									</button>
								</div>
							{/if}
						</div>
					{:else if currentActivity?.type === 'srs_review'}
						<div class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
							<h3 class="font-display text-xl text-surface-900">Review Time</h3>
							<p class="mt-2 text-surface-500">Quick refresh before moving ahead.</p>

							<div class="mt-5 space-y-3">
								{#each reviewWordCards as card, idx}
									<button
										onclick={() => toggleReviewWord(idx)}
										class="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-4 text-left transition-all hover:border-primary-200 hover:bg-white"
									>
										<div class="flex items-center gap-3">
											<AudioPlayer
												text={card.word}
												language={targetLanguage}
												audioUrl={card.audioUrl}
												size="md"
											/>
											<p class="font-display text-3xl text-surface-900">{card.word}</p>
										</div>
										{#if revealedReviewWords[idx]}
											<div class="mt-3 space-y-1">
												{#if card.romanization}
													<p class="text-sm text-primary-600">{card.romanization}</p>
												{/if}
												{#if card.meaning}
													<p class="text-base font-medium text-surface-700">{card.meaning}</p>
												{/if}
												{#if card.sceneDescription}
													<p
														class="mt-1 text-sm italic text-surface-500 border-l-2 border-accent-300 pl-3"
													>
														{card.sceneDescription}
													</p>
												{/if}
											</div>
										{:else}
											<p class="mt-2 text-xs text-surface-400">Tap to reveal meaning</p>
										{/if}
									</button>
								{/each}
							</div>
						</div>
					{:else if currentActivity?.type === 'quiz'}
						<div class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm text-center">
							<div
								class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10"
							>
								<svg
									class="h-7 w-7 text-warning"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<circle cx="12" cy="12" r="10" />
									<path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
									<line x1="12" y1="17" x2="12.01" y2="17" />
								</svg>
							</div>
							<h3 class="font-display text-xl text-surface-900">Quiz Time</h3>
							<p class="mt-2 text-surface-500">Test your knowledge of today's vocabulary</p>
							<button
								onclick={startQuiz}
								disabled={quizLoading}
								class="mt-5 w-full rounded-xl bg-primary-600 px-4 py-3.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50"
							>
								{quizLoading ? 'Generating Quiz...' : 'Take Quiz'}
							</button>
						</div>
					{:else if currentActivity?.type === 'speaking'}
						<div class="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
							<div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-error/10">
								<svg
									class="h-7 w-7 text-error"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
									<path d="M19 10v2a7 7 0 01-14 0v-2" />
									<line x1="12" y1="19" x2="12" y2="23" />
									<line x1="8" y1="23" x2="16" y2="23" />
								</svg>
							</div>
							<h3 class="font-display text-xl text-surface-900">Speaking Practice</h3>
							<p class="mt-2 text-surface-500">Practice pronouncing today's vocabulary</p>

							{#if speakingComplete}
								<div
									class="mt-5 rounded-xl border border-success/30 bg-success/10 px-4 py-4 text-center"
								>
									<p class="text-lg font-semibold text-success">Speaking Practice Complete!</p>
									<p class="mt-1 text-sm text-surface-600">Great job pronouncing all words.</p>
								</div>
							{:else if currentSpeakingVocab}
								<p class="mt-3 text-sm text-surface-500">
									Word {speakingWordIndex + 1} of {vocabTargets.length}
								</p>
								<div class="mt-4">
									<SpeakingActivity
										targetPhrase={currentSpeakingVocab.word}
										romanization={currentSpeakingVocab.romanization}
										language={targetLanguage}
										{lessonLanguage}
										onComplete={handleSpeakingComplete}
									/>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/key}
		</div>

		<!-- Navigation -->
		<div class="mt-6 flex items-center gap-3 px-1 pb-2">
			<button
				onclick={goPrev}
				disabled={currentIndex === 0}
				class="flex items-center gap-1.5 rounded-xl border border-surface-200 px-4 py-3 text-sm font-medium text-surface-600 transition-all
					hover:bg-surface-50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-30"
			>
				<svg
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polyline points="15 18 9 12 15 6" />
				</svg>
				Previous
			</button>
			<div class="flex-1"></div>
			<button
				onclick={goNext}
				disabled={nextDisabled}
				class="flex items-center gap-1.5 rounded-xl bg-primary-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all
					hover:bg-primary-700 hover:shadow-md active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
			>
				{currentIndex < totalActivities - 1 ? 'Next' : 'Finish'}
				<svg
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polyline points="9 18 15 12 9 6" />
				</svg>
			</button>
		</div>
	{/if}
</div>
