<script lang="ts">
	import { page } from '$app/stores';
	import ConversationChat from '$lib/components/ConversationChat.svelte';
	import ConversationAnalysis from '$lib/components/ConversationAnalysis.svelte';
	import AudioPlayer from '$lib/components/AudioPlayer.svelte';
	import { clearChat, getChat, initiateConversation } from '$lib/stores/chat.svelte';
	import type { Scenario } from '$lib/types/scenario';
	import type { ConversationAnalysis as AnalysisType } from '$lib/types/conversation';

	let { data } = $props();

	const fromLesson = $derived($page.url.searchParams.get('from'));
	const fromStep = $derived($page.url.searchParams.get('step'));
	const learner = data.learner as {
		id: string;
		name: string;
		targetLanguage: string;
		lessonLanguage: string;
		cefrLevel: string;
	};
	const scenarios = data.scenarios as Scenario[];
	const chat = getChat();

	let activeScenario = $state<string | undefined>(undefined);
	let isConversing = $state(false);
	let sessionAnalysis = $state<AnalysisType | null>(null);

	function startConversation(scenarioContext?: string) {
		clearChat();
		activeScenario = scenarioContext;
		isConversing = true;
		sessionAnalysis = null;
		if (scenarioContext) {
			initiateConversation(learner.id, scenarioContext);
		}
	}

	function handleSessionEnd() {
		isConversing = false;
		sessionAnalysis = chat.analysis;
	}

	function backToScenarios() {
		clearChat();
		isConversing = false;
		sessionAnalysis = null;
		activeScenario = undefined;
	}
</script>

<div class="mx-auto max-w-2xl py-8">
	{#if sessionAnalysis}
		<ConversationAnalysis analysis={sessionAnalysis} onDismiss={backToScenarios} />
	{:else if isConversing}
		<div class="mb-4">
			<button
				onclick={backToScenarios}
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
		<ConversationChat
			learnerId={learner.id}
			scenario={activeScenario}
			targetLanguage={learner.targetLanguage}
			onSessionEnd={handleSessionEnd}
		/>
	{:else}
		{#if fromLesson}
			<div class="mb-4">
				<a
					href="/learn/{fromLesson}{fromStep ? `?step=${fromStep}` : ''}"
					class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50"
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
					Back to Lesson
				</a>
			</div>
		{/if}

		<div class="mb-6">
			<h2 class="font-display text-2xl text-gray-900">Conversation Practice</h2>
			<p class="mt-1 text-sm text-gray-500">Choose a scenario or start a free conversation</p>
		</div>

		<button
			onclick={() => startConversation()}
			class="mb-6 flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-5 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.98]"
		>
			<div
				class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600"
			>
				<svg
					class="h-6 w-6"
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
			<div>
				<p class="font-medium text-indigo-900">Free Conversation</p>
				<p class="text-sm text-indigo-600">Chat freely with your AI tutor</p>
			</div>
		</button>

		{#if scenarios.length > 0}
			<h3 class="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
				{learner.cefrLevel} Scenarios
			</h3>
			<div class="space-y-3">
				{#each scenarios as scenario (scenario.id)}
					<button
						onclick={() => startConversation(scenario.systemPromptContext)}
						class="group w-full rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all hover:border-gray-200 hover:shadow-md active:scale-[0.98]"
					>
						<div class="flex items-start gap-4">
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-lg group-hover:bg-indigo-50"
							>
								💬
							</div>
							<div class="min-w-0 flex-1">
								<p class="font-medium text-gray-900 group-hover:text-indigo-700">
									{scenario.title}
								</p>
								<p class="mt-1 text-sm text-gray-500 line-clamp-2">{scenario.description}</p>
								{#if scenario.suggestedVocab.length > 0}
									<div class="mt-2 flex flex-wrap gap-1.5">
										{#each scenario.suggestedVocab.slice(0, 4) as word}
											<span
												class="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5 text-xs text-gray-600"
											>
												{word}
												<AudioPlayer text={word} size="sm" />
											</span>
										{/each}
										{#if scenario.suggestedVocab.length > 4}
											<span class="text-xs text-gray-400"
												>+{scenario.suggestedVocab.length - 4}</span
											>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					</button>
				{/each}
			</div>
		{:else}
			<div class="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
				<p class="text-gray-500">No scenarios available for {learner.cefrLevel} level yet.</p>
			</div>
		{/if}
	{/if}
</div>
