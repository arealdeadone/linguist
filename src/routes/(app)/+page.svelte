<script lang="ts">
	import { goto } from '$app/navigation';
	import { showToast } from '$lib/stores/toast.svelte';

	let { data } = $props();

	interface LearnerData {
		id: string;
		name: string;
		targetLanguage: string;
		lessonLanguage: string;
		cefrLevel: string;
	}

	type DashboardStats = { total_cards: number; due_today: number };
	const DEFAULT_STATS: DashboardStats = { total_cards: 0, due_today: 0 };

	const learner = $derived((data.learner as LearnerData | null) ?? null);

	let stats = $state<DashboardStats>(DEFAULT_STATS);
	let lessonCount = $state(0);
	let isLoadingStats = $state(false);

	const languageFlags: Record<string, string> = {
		zh: '🇨🇳',
		te: 'తె',
		hi: '🇮🇳',
		th: '🇹🇭',
		en: '🇬🇧'
	};

	const greetings: Record<string, (name: string) => string> = {
		hi: (name: string) => `नमस्ते, ${name}!`,
		th: (name: string) => `สวัสดี, ${name}!`,
		en: (name: string) => `Hello, ${name}!`
	};

	function getGreeting(currentLearner: LearnerData): string {
		const greet = greetings[currentLearner.lessonLanguage];
		return greet ? greet(currentLearner.name) : `Hello, ${currentLearner.name}!`;
	}

	async function loadStats() {
		if (!learner) return;

		isLoadingStats = true;
		try {
			const [srsRes, lessonsRes] = await Promise.all([
				fetch('/api/srs/stats'),
				fetch('/api/lessons')
			]);

			if (!srsRes.ok) {
				const err = await srsRes.json().catch((e: unknown) => {
					console.error('Failed to parse SRS error response:', e);
					return {};
				});
				throw new Error((err as { error?: string }).error ?? 'Failed to load SRS stats');
			}

			if (!lessonsRes.ok) {
				const err = await lessonsRes.json().catch((e: unknown) => {
					console.error('Failed to parse lessons error response:', e);
					return {};
				});
				throw new Error((err as { error?: string }).error ?? 'Failed to load lessons');
			}

			stats = (await srsRes.json()) as DashboardStats;
			const lessons = (await lessonsRes.json()) as unknown[];
			lessonCount = lessons.length;
		} catch (error) {
			console.error('Could not load dashboard stats:', error);
			stats = DEFAULT_STATS;
			lessonCount = 0;
			showToast('Could not load stats', 'error');
		} finally {
			isLoadingStats = false;
		}
	}

	$effect(() => {
		if (learner) {
			loadStats();
			return;
		}

		showToast('Learner profile not found for this account.', 'error');
	});
</script>

<div class="mx-auto max-w-2xl py-8">
	{#if learner}
		<div class="mb-8 animate-fade-in">
			<h2 class="font-display text-3xl text-surface-900">
				{getGreeting(learner)}
			</h2>
			<p class="mt-1.5 text-surface-500">
				Learning {languageFlags[learner.targetLanguage]}
				{learner.targetLanguage === 'zh' ? 'Chinese' : 'Telugu'}
				via {learner.lessonLanguage === 'hi'
					? 'Hindi'
					: learner.lessonLanguage === 'th'
						? 'Thai'
						: 'English'}
			</p>
		</div>

		<div class="mb-8 grid grid-cols-2 gap-3">
			<div
				class="rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-5 shadow-sm"
			>
				<p class="text-xs font-medium tracking-wide text-primary-400 uppercase">CEFR Level</p>
				<p class="mt-1 font-display text-2xl text-primary-700">{learner.cefrLevel}</p>
			</div>
			<div
				class="rounded-2xl border border-accent-100 bg-gradient-to-br from-accent-50 to-white p-5 shadow-sm"
			>
				<p class="text-xs font-medium tracking-wide text-accent-500 uppercase">Words Learned</p>
				<p class="mt-1 font-display text-2xl text-accent-700">
					{#if isLoadingStats}
						<span class="inline-block h-7 w-12 animate-pulse rounded-lg bg-accent-100"></span>
					{:else}
						{stats.total_cards}
					{/if}
				</p>
			</div>
			<div
				class="rounded-2xl border border-surface-100 bg-gradient-to-br from-surface-50 to-white p-5 shadow-sm"
			>
				<p class="text-xs font-medium tracking-wide text-surface-400 uppercase">Due Reviews</p>
				<p class="mt-1 font-display text-2xl text-surface-800">
					{#if isLoadingStats}
						<span class="inline-block h-7 w-12 animate-pulse rounded-lg bg-surface-100"></span>
					{:else}
						{stats.due_today}
					{/if}
				</p>
			</div>
			<div
				class="rounded-2xl border border-surface-100 bg-gradient-to-br from-surface-50 to-white p-5 shadow-sm"
			>
				<p class="text-xs font-medium tracking-wide text-surface-400 uppercase">Lessons</p>
				<p class="mt-1 font-display text-2xl text-surface-800">
					{#if isLoadingStats}
						<span class="inline-block h-7 w-12 animate-pulse rounded-lg bg-surface-100"></span>
					{:else}
						{lessonCount}
					{/if}
				</p>
			</div>
		</div>

		<div class="space-y-3">
			<button
				onclick={() => goto('/learn')}
				class="group flex w-full items-center gap-4 rounded-2xl border border-primary-100 bg-white p-5 shadow-sm transition-all duration-200 hover:border-primary-200 hover:shadow-md active:scale-[0.98]"
			>
				<div
					class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white"
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
							d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
						/>
					</svg>
				</div>
				<div class="text-left">
					<p class="font-medium text-surface-900">Start Lesson</p>
					<p class="text-sm text-surface-400">Continue your structured learning path</p>
				</div>
			</button>

			<button
				onclick={() => goto('/review')}
				class="group flex w-full items-center gap-4 rounded-2xl border border-accent-100 bg-white p-5 shadow-sm transition-all duration-200 hover:border-accent-200 hover:shadow-md active:scale-[0.98]"
			>
				<div
					class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-600 transition-colors group-hover:bg-accent-600 group-hover:text-white"
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
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
				</div>
				<div class="text-left">
					<p class="font-medium text-surface-900">Review Cards</p>
					<p class="text-sm text-surface-400">
						{#if stats.due_today > 0}
							{stats.due_today} card{stats.due_today === 1 ? '' : 's'} due today
						{:else}
							Strengthen your vocabulary with SRS
						{/if}
					</p>
				</div>
			</button>

			<button
				onclick={() => goto('/converse')}
				class="group flex w-full items-center gap-4 rounded-2xl border border-surface-100 bg-white p-5 shadow-sm transition-all duration-200 hover:border-surface-200 hover:shadow-md active:scale-[0.98]"
			>
				<div
					class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-100 text-surface-500 transition-colors group-hover:bg-primary-600 group-hover:text-white"
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
				<div class="text-left">
					<p class="font-medium text-surface-900">Free Conversation</p>
					<p class="text-sm text-surface-400">Practice speaking naturally with AI</p>
				</div>
			</button>
		</div>
	{:else}
		<div class="rounded-2xl border border-error/20 bg-error/5 p-6 text-center">
			<p class="font-medium text-error">Learner profile unavailable.</p>
			<p class="mt-1 text-sm text-surface-500">Please contact your admin to link your account.</p>
		</div>
	{/if}
</div>
