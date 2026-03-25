<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toast.svelte';

	let { data } = $props();

	interface LessonRecord {
		id: string;
		cefrLevel: string;
		week: number | null;
		day: number | null;
		theme: string | null;
		status: string;
		plan: Record<string, unknown>;
		createdAt: Date;
	}

	let lessons = $state<LessonRecord[]>(data.lessons as LessonRecord[]);
	let isGenerating = $state(false);
	let generateError = $state('');
	let showGenerateForm = $state(false);
	let newTheme = $state('');

	const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
		pending: {
			label: 'Pending',
			bg: 'bg-surface-100',
			text: 'text-surface-600',
			dot: 'bg-surface-400'
		},
		in_progress: {
			label: 'In Progress',
			bg: 'bg-accent-50',
			text: 'text-accent-700',
			dot: 'bg-accent-400'
		},
		completed: {
			label: 'Completed',
			bg: 'bg-green-50',
			text: 'text-green-700',
			dot: 'bg-green-500'
		}
	};

	function getStatusStyle(status: string) {
		return statusConfig[status] ?? statusConfig.pending;
	}

	function formatDate(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	async function generateLesson() {
		isGenerating = true;
		generateError = '';

		try {
			const res = await fetch('/api/lessons', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					learnerId: data.learnerId,
					week: Math.floor(lessons.length / 5) + 1,
					day: (lessons.length % 5) + 1,
					theme: newTheme.trim() || undefined
				})
			});

			if (!res.ok) {
				const err = await res.text();
				generateError = err || 'Failed to generate lesson';
				return;
			}

			const lesson = (await res.json()) as LessonRecord;
			lessons = [lesson, ...lessons];
			showGenerateForm = false;
			newTheme = '';
			await invalidateAll();
		} catch {
			generateError = 'Connection error. Please try again.';
			showToast('Failed to generate lesson', 'error');
		} finally {
			isGenerating = false;
		}
	}
</script>

<div class="mx-auto max-w-2xl py-8">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h2 class="font-display text-2xl text-surface-900">Your Lessons</h2>
			<p class="mt-0.5 text-sm text-surface-400">
				{lessons.length} lesson{lessons.length === 1 ? '' : 's'} total
			</p>
		</div>
		<button
			onclick={() => {
				showGenerateForm = !showGenerateForm;
			}}
			class="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md active:scale-95"
		>
			<svg
				class="h-5 w-5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M12 5v14m-7-7h14" />
			</svg>
			<span class="hidden sm:inline">New Lesson</span>
		</button>
	</div>

	{#if showGenerateForm}
		<div class="mb-6 rounded-2xl border border-primary-100 bg-primary-50/50 p-5 animate-slide-down">
			<p class="text-sm font-medium text-primary-700">Generate a new lesson</p>
			<p class="mt-0.5 text-xs text-primary-400">
				Optionally provide a theme, or leave blank for AI to choose.
			</p>
			<div class="mt-3 flex gap-2">
				<input
					type="text"
					bind:value={newTheme}
					placeholder="e.g. Ordering food, Family members..."
					class="flex-1 rounded-xl border border-primary-200 bg-white px-4 py-2.5 text-sm text-surface-900 placeholder:text-surface-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:outline-none"
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter') generateLesson();
					}}
				/>
				<button
					onclick={generateLesson}
					disabled={isGenerating}
					class="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 font-medium text-white transition-all hover:bg-primary-700 disabled:opacity-50 active:scale-95"
				>
					{#if isGenerating}
						<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
						Generating…
					{:else}
						Generate
					{/if}
				</button>
			</div>
			{#if generateError}
				<p class="mt-2 text-sm text-error">{generateError}</p>
			{/if}
		</div>
	{/if}

	{#if lessons.length === 0}
		<div
			class="flex flex-col items-center rounded-2xl border border-surface-100 bg-white py-20 shadow-sm"
		>
			<span class="text-6xl">📖</span>
			<p class="mt-5 text-lg font-medium text-surface-700">No lessons yet</p>
			<p class="mt-1 text-sm text-surface-400">Generate your first lesson to start learning!</p>
			<button
				onclick={() => {
					showGenerateForm = true;
				}}
				class="mt-6 flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-medium text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md active:scale-95"
			>
				<svg
					class="h-5 w-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M12 5v14m-7-7h14" />
				</svg>
				Generate First Lesson
			</button>
		</div>
	{:else}
		<div class="space-y-3">
			{#each lessons as lesson, i (lesson.id)}
				{@const style = getStatusStyle(lesson.status)}
				<a
					href="/learn/{lesson.id}"
					class="group block rounded-2xl border border-surface-100 bg-white p-5 shadow-sm transition-all duration-200 hover:border-surface-200 hover:shadow-md active:scale-[0.98]"
					style="animation: fade-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) {i * 0.05}s both"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								{#if lesson.week && lesson.day}
									<span class="text-xs font-medium text-surface-400">
										W{lesson.week}·D{lesson.day}
									</span>
									<span class="text-surface-200">·</span>
								{/if}
								<span
									class="rounded-md bg-primary-50 px-1.5 py-0.5 text-xs font-medium text-primary-600"
								>
									{lesson.cefrLevel}
								</span>
							</div>
							<p
								class="mt-1.5 truncate text-base font-medium text-surface-900 group-hover:text-primary-700"
							>
								{lesson.theme ?? 'Untitled Lesson'}
							</p>
							<p class="mt-0.5 text-xs text-surface-400">
								{formatDate(lesson.createdAt)}
							</p>
						</div>
						<div class="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 {style.bg}">
							<span class="h-1.5 w-1.5 rounded-full {style.dot}"></span>
							<span class="text-xs font-medium {style.text}">{style.label}</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	@keyframes fade-up {
		from {
			opacity: 0;
			transform: translateY(12px);
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
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.animate-slide-down {
		animation: slide-down 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
</style>
