<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { setActiveLearner, getActiveLearner } from '$lib/stores/learner.svelte';
	import type { LearnerProfile } from '$lib/stores/learner.svelte';
	import { showToast } from '$lib/stores/toast.svelte';

	let { data } = $props();

	let pin = $state('');
	let loginName = $state('');
	let selectedLearnerId = $state<string | null>(null);
	let authError = $state('');
	let isAuthenticating = $state(false);

	type DashboardStats = { total_cards: number; due_today: number };
	const DEFAULT_STATS: DashboardStats = { total_cards: 0, due_today: 0 };
	let stats = $state<DashboardStats>(DEFAULT_STATS);
	let lessonCount = $state(0);
	let isLoadingStats = $state(false);
	let isCreatingProfile = $state(false);
	let createName = $state('');
	let createTargetLanguage = $state<string>('zh');
	let createLessonLanguage = $state<string>('en');
	let createPin = $state('');

	const activeLearner = $derived(getActiveLearner());

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

	function getGreeting(learner: LearnerProfile): string {
		const greet = greetings[learner.lessonLanguage];
		return greet ? greet(learner.name) : `Hello, ${learner.name}!`;
	}

	async function authenticate() {
		if (!loginName.trim() || !pin.trim()) {
			authError = 'Please enter your name and PIN';
			return;
		}

		isAuthenticating = true;
		authError = '';

		try {
			const res = await fetch('/api/profile', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: loginName.trim(), pin: pin.trim() })
			});

			if (!res.ok) {
				authError = 'Invalid name or PIN. Please try again.';
				return;
			}

			const learner = (await res.json()) as LearnerProfile;
			setActiveLearner(learner);
			selectedLearnerId = null;
			loginName = '';
			pin = '';
			await invalidateAll();

			if (!data.learnerId) {
				showToast('Session could not be saved. Try using HTTPS or localhost.', 'error');
			}

			await loadStats(learner.id);
		} catch {
			authError = 'Login failed';
			showToast('Login failed', 'error');
		} finally {
			isAuthenticating = false;
		}
	}

	async function createProfile() {
		if (!createName.trim() || !createPin.trim()) {
			showToast('Name and PIN are required to create a profile.', 'error');
			return;
		}

		isCreatingProfile = true;
		try {
			const res = await fetch('/api/profile', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: createName.trim(),
					targetLanguage: createTargetLanguage,
					lessonLanguage: createLessonLanguage,
					pin: createPin.trim()
				})
			});

			if (!res.ok) {
				let errorMessage = 'Failed to create profile';
				try {
					const err = (await res.json()) as { error?: string };
					if (typeof err.error === 'string' && err.error.trim().length > 0) {
						errorMessage = err.error;
					}
				} catch {
					errorMessage = 'Failed to create profile';
				}
				showToast(errorMessage, 'error');
				return;
			}

			createName = '';
			createPin = '';
			showToast('Profile created. Please log in with your PIN.', 'success');
			await invalidateAll();
		} catch {
			showToast('Could not create profile. Please try again.', 'error');
		} finally {
			isCreatingProfile = false;
		}
	}

	function selectLearner(id: string, name: string) {
		selectedLearnerId = selectedLearnerId === id ? null : id;
		authError = '';
		loginName = selectedLearnerId === id ? '' : name;
		pin = '';
	}

	async function loadStats(learnerId: string) {
		isLoadingStats = true;
		try {
			const [srsRes, lessonsRes] = await Promise.all([
				fetch(`/api/srs/stats?learnerId=${learnerId}`),
				fetch(`/api/lessons?learnerId=${learnerId}`)
			]);

			if (!srsRes.ok) {
				throw new Error(`Failed to load SRS stats: ${srsRes.status}`);
			}
			if (!lessonsRes.ok) {
				throw new Error(`Failed to load lessons: ${lessonsRes.status}`);
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
		if (activeLearner) {
			loadStats(activeLearner.id);
		}
	});
</script>

<div class="mx-auto max-w-2xl py-8">
	{#if activeLearner}
		<div class="mb-8 animate-fade-in">
			<h2 class="font-display text-3xl text-surface-900">
				{getGreeting(activeLearner)}
			</h2>
			<p class="mt-1.5 text-surface-500">
				Learning {languageFlags[activeLearner.targetLanguage]}
				{activeLearner.targetLanguage === 'zh' ? 'Chinese' : 'Telugu'}
				via {activeLearner.lessonLanguage === 'hi'
					? 'Hindi'
					: activeLearner.lessonLanguage === 'th'
						? 'Thai'
						: 'English'}
			</p>
		</div>

		<div class="mb-8 grid grid-cols-2 gap-3">
			<div
				class="rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-5 shadow-sm"
			>
				<p class="text-xs font-medium tracking-wide text-primary-400 uppercase">CEFR Level</p>
				<p class="mt-1 font-display text-2xl text-primary-700">{activeLearner.cefrLevel}</p>
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
				<svg
					class="ml-auto h-5 w-5 text-surface-300 transition-transform group-hover:translate-x-0.5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M9 18l6-6-6-6" />
				</svg>
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
				<svg
					class="ml-auto h-5 w-5 text-surface-300 transition-transform group-hover:translate-x-0.5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M9 18l6-6-6-6" />
				</svg>
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
				<svg
					class="ml-auto h-5 w-5 text-surface-300 transition-transform group-hover:translate-x-0.5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M9 18l6-6-6-6" />
				</svg>
			</button>
		</div>
	{:else}
		<div class="mb-8">
			<h2 class="font-display text-3xl text-surface-900">Welcome to Linguist</h2>
			<p class="mt-1.5 text-surface-500">Select your profile to start learning.</p>
		</div>

		{#if data.learners.length === 0}
			<div class="rounded-2xl border border-surface-100 bg-white p-6 shadow-sm">
				<h3 class="font-display text-2xl text-surface-900">Create Profile</h3>
				<p class="mt-1 text-sm text-surface-500">Set up your first learner profile.</p>

				<div class="mt-5 space-y-4">
					<div>
						<label class="mb-1 block text-sm font-medium text-surface-700" for="create-name"
							>Name</label
						>
						<input
							id="create-name"
							type="text"
							bind:value={createName}
							placeholder="Your name"
							class="w-full rounded-xl border border-surface-200 px-4 py-2.5 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:outline-none"
						/>
					</div>

					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<label
								class="mb-1 block text-sm font-medium text-surface-700"
								for="create-target-language">Target Language</label
							>
							<select
								id="create-target-language"
								bind:value={createTargetLanguage}
								class="w-full rounded-xl border border-surface-200 bg-white px-4 py-2.5 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:outline-none"
							>
								<option value="zh">Chinese</option>
								<option value="te">Telugu</option>
							</select>
						</div>
						<div>
							<label
								class="mb-1 block text-sm font-medium text-surface-700"
								for="create-lesson-language">Lesson Language</label
							>
							<select
								id="create-lesson-language"
								bind:value={createLessonLanguage}
								class="w-full rounded-xl border border-surface-200 bg-white px-4 py-2.5 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:outline-none"
							>
								<option value="hi">Hindi</option>
								<option value="th">Thai</option>
								<option value="en">English</option>
							</select>
						</div>
					</div>

					<div>
						<label class="mb-1 block text-sm font-medium text-surface-700" for="create-pin"
							>PIN</label
						>
						<input
							id="create-pin"
							type="password"
							bind:value={createPin}
							maxlength="6"
							placeholder="4-6 digits"
							class="w-full rounded-xl border border-surface-200 px-4 py-2.5 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:outline-none"
						/>
					</div>

					<button
						onclick={createProfile}
						disabled={isCreatingProfile}
						class="w-full rounded-xl bg-primary-600 px-4 py-3 font-medium text-white transition-all hover:bg-primary-700 disabled:opacity-50"
					>
						{isCreatingProfile ? 'Creating...' : 'Create Profile'}
					</button>
				</div>
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.learners as learner (learner.id)}
					{@const isSelected = selectedLearnerId === learner.id}
					<div>
						<button
							onclick={() => selectLearner(learner.id, learner.name)}
							class="w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-200 active:scale-[0.98]
								{isSelected
								? 'border-primary-300 shadow-md ring-2 ring-primary-100'
								: 'border-surface-100 hover:border-surface-200 hover:shadow-md'}"
						>
							<div class="flex items-center gap-4">
								<div
									class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-100 to-accent-50 text-2xl"
								>
									{languageFlags[learner.targetLanguage] ?? '🌍'}
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate text-lg font-medium text-surface-900">{learner.name}</p>
									<div class="mt-0.5 flex items-center gap-2 text-sm text-surface-400">
										<span>{learner.targetLanguage === 'zh' ? 'Chinese' : 'Telugu'}</span>
										<span class="text-surface-200">·</span>
										<span
											>via {learner.lessonLanguage === 'hi'
												? 'Hindi'
												: learner.lessonLanguage === 'th'
													? 'Thai'
													: 'English'}</span
										>
										<span class="text-surface-200">·</span>
										<span
											class="rounded-md bg-primary-50 px-1.5 py-0.5 text-xs font-medium text-primary-600"
											>{learner.cefrLevel}</span
										>
									</div>
								</div>
								<svg
									class="h-5 w-5 shrink-0 text-surface-300 transition-transform duration-200 {isSelected
										? 'rotate-180'
										: ''}"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M6 9l6 6 6-6" />
								</svg>
							</div>
						</button>

						{#if isSelected}
							<div
								class="mt-2 overflow-hidden rounded-2xl border border-primary-100 bg-primary-50/50 p-5 animate-slide-down"
							>
								<label class="block text-sm font-medium text-primary-700" for="name-input">
									Name
								</label>
								<input
									id="name-input"
									type="text"
									bind:value={loginName}
									placeholder="Your name"
									class="mt-1 w-full rounded-xl border border-primary-200 bg-white px-4 py-2.5 text-surface-900 placeholder:text-surface-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:outline-none"
								/>
								<label class="mt-3 block text-sm font-medium text-primary-700" for="pin-input">
									PIN
								</label>
								<div class="mt-1 flex gap-2">
									<input
										id="pin-input"
										type="password"
										bind:value={pin}
										placeholder="••••"
										maxlength="6"
										class="flex-1 rounded-xl border border-primary-200 bg-white px-4 py-2.5 text-center text-lg tracking-widest text-surface-900 placeholder:text-surface-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:outline-none"
										onkeydown={(e: KeyboardEvent) => {
											if (e.key === 'Enter') authenticate();
										}}
									/>
									<button
										onclick={authenticate}
										disabled={isAuthenticating}
										class="rounded-xl bg-primary-600 px-6 py-2.5 font-medium text-white transition-all hover:bg-primary-700 disabled:opacity-50 active:scale-95"
									>
										{#if isAuthenticating}
											<svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
												<circle
													class="opacity-25"
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													stroke-width="4"
												></circle>
												<path
													class="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
												></path>
											</svg>
										{:else}
											Go
										{/if}
									</button>
								</div>
								{#if authError}
									<p class="mt-2 text-sm text-error">{authError}</p>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
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
	@keyframes slide-down {
		from {
			opacity: 0;
			transform: translateY(-8px);
			max-height: 0;
		}
		to {
			opacity: 1;
			transform: translateY(0);
			max-height: 200px;
		}
	}
	.animate-fade-in {
		animation: fade-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
	.animate-slide-down {
		animation: slide-down 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
</style>
