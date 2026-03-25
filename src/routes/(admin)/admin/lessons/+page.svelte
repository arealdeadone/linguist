<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toast.svelte';

	type LessonStatus = 'pending' | 'in_progress' | 'completed';

	interface LessonRow {
		id: string;
		cefrLevel: string;
		week: number | null;
		day: number | null;
		theme: string | null;
		status: LessonStatus;
		createdAt: string;
		vocabCount: number;
	}

	interface LearnerOption {
		id: string;
		name: string;
		targetLanguage: string;
		lessonLanguage: string;
	}

	let { data } = $props();

	let selectedLearnerId = $state<string | null>(data.selectedLearnerId);
	let lessons = $state<LessonRow[]>(data.lessons as LessonRow[]);
	let isGenerating = $state(false);
	let deletingLessonId = $state<string | null>(null);
	let regeneratingLessonId = $state<string | null>(null);

	const learners = data.learners as LearnerOption[];

	const statusStyles: Record<LessonStatus, string> = {
		pending: 'bg-gray-700/40 text-gray-300',
		in_progress: 'bg-amber-500/20 text-amber-300',
		completed: 'bg-emerald-500/20 text-emerald-300'
	};

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	async function reloadLessons(): Promise<void> {
		if (!selectedLearnerId) {
			lessons = [];
			return;
		}

		const res = await fetch(`/admin/api/users/${selectedLearnerId}/lessons`);
		if (!res.ok) {
			const err = (await res.json()) as { error?: string };
			throw new Error(err.error ?? 'Failed to load lessons');
		}

		lessons = (await res.json()) as LessonRow[];
	}

	function getNextWeekDay(currentLessons: LessonRow[]): { week: number; day: number } {
		if (currentLessons.length === 0) {
			return { week: 1, day: 1 };
		}

		let maxWeek = 1;
		let maxDay = 1;
		for (const lesson of currentLessons) {
			const week = lesson.week ?? 1;
			const day = lesson.day ?? 1;
			if (week > maxWeek) {
				maxWeek = week;
				maxDay = day;
				continue;
			}
			if (week === maxWeek && day > maxDay) {
				maxDay = day;
			}
		}

		if (maxDay >= 5) {
			return { week: maxWeek + 1, day: 1 };
		}

		return { week: maxWeek, day: maxDay + 1 };
	}

	async function changeLearner(learnerId: string): Promise<void> {
		selectedLearnerId = learnerId;
		await goto(`/admin/lessons?learnerId=${learnerId}`);
	}

	async function generateLesson(): Promise<void> {
		if (!selectedLearnerId) {
			showToast('Select a learner first.', 'error');
			return;
		}

		isGenerating = true;
		try {
			const { week, day } = getNextWeekDay(lessons);
			const res = await fetch('/api/lessons', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ learnerId: selectedLearnerId, week, day })
			});

			if (!res.ok) {
				const err = (await res.json()) as { error?: string };
				showToast(err.error ?? 'Failed to generate lesson.', 'error');
				return;
			}

			await reloadLessons();
			await invalidateAll();
			showToast('Lesson generated.', 'success');
		} catch (error) {
			console.error('Generate lesson failed:', error);
			showToast('Failed to generate lesson.', 'error');
		} finally {
			isGenerating = false;
		}
	}

	async function deleteLesson(lessonId: string): Promise<void> {
		if (!selectedLearnerId) {
			showToast('Select a learner first.', 'error');
			return;
		}

		if (!confirm('Delete this lesson? Vocabulary unique to this lesson will also be removed.')) {
			return;
		}

		deletingLessonId = lessonId;
		try {
			const res = await fetch(`/admin/api/users/${selectedLearnerId}/lessons/${lessonId}`, {
				method: 'DELETE'
			});

			if (!res.ok) {
				const err = (await res.json()) as { error?: string };
				showToast(err.error ?? 'Failed to delete lesson.', 'error');
				return;
			}

			await reloadLessons();
			await invalidateAll();
			showToast('Lesson deleted.', 'success');
		} catch (error) {
			console.error('Delete lesson failed:', error);
			showToast('Failed to delete lesson.', 'error');
		} finally {
			deletingLessonId = null;
		}
	}

	async function regenerateLesson(lessonId: string): Promise<void> {
		if (!selectedLearnerId) {
			showToast('Select a learner first.', 'error');
			return;
		}

		if (!confirm('Regenerate this lesson with same week/day?')) {
			return;
		}

		regeneratingLessonId = lessonId;
		try {
			const res = await fetch(
				`/admin/api/users/${selectedLearnerId}/lessons/${lessonId}/regenerate`,
				{ method: 'POST' }
			);

			if (!res.ok) {
				const err = (await res.json()) as { error?: string };
				showToast(err.error ?? 'Failed to regenerate lesson.', 'error');
				return;
			}

			await reloadLessons();
			await invalidateAll();
			showToast('Lesson regenerated.', 'success');
		} catch (error) {
			console.error('Regenerate lesson failed:', error);
			showToast('Failed to regenerate lesson.', 'error');
		} finally {
			regeneratingLessonId = null;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h2 class="text-2xl font-bold text-white">Lessons</h2>
			<p class="mt-1 text-sm text-gray-500">Manage learner lessons and regeneration.</p>
		</div>
		<button
			onclick={generateLesson}
			disabled={isGenerating || !selectedLearnerId}
			class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
		>
			{isGenerating ? 'Generating…' : 'Generate New Lesson'}
		</button>
	</div>

	<div class="rounded-xl border border-gray-800 bg-gray-900 p-4">
		<label
			for="learner-select"
			class="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-400"
		>
			Learner
		</label>
		<select
			id="learner-select"
			value={selectedLearnerId ?? ''}
			onchange={(event) => changeLearner((event.currentTarget as HTMLSelectElement).value)}
			class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
		>
			{#if learners.length === 0}
				<option value="">No learners found</option>
			{:else}
				{#each learners as learner}
					<option value={learner.id}>
						{learner.name} ({learner.targetLanguage} → {learner.lessonLanguage})
					</option>
				{/each}
			{/if}
		</select>
	</div>

	<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
		<table class="w-full text-left text-sm">
			<thead>
				<tr class="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
					<th class="px-4 py-3">Week</th>
					<th class="px-4 py-3">Day</th>
					<th class="px-4 py-3">Theme</th>
					<th class="px-4 py-3">Status</th>
					<th class="px-4 py-3 text-right">Vocab</th>
					<th class="px-4 py-3">Created</th>
					<th class="px-4 py-3 text-right">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-800">
				{#each lessons as lesson (lesson.id)}
					<tr class="transition-colors hover:bg-gray-800/40">
						<td class="px-4 py-3 text-gray-300">{lesson.week ?? '—'}</td>
						<td class="px-4 py-3 text-gray-300">{lesson.day ?? '—'}</td>
						<td class="max-w-xs truncate px-4 py-3 font-medium text-white">
							{lesson.theme ?? 'Untitled lesson'}
						</td>
						<td class="px-4 py-3">
							<span class="rounded px-2 py-0.5 text-xs font-medium {statusStyles[lesson.status]}">
								{lesson.status}
							</span>
						</td>
						<td class="px-4 py-3 text-right font-mono text-gray-300">{lesson.vocabCount}</td>
						<td class="px-4 py-3 text-gray-400">{formatDate(lesson.createdAt)}</td>
						<td class="px-4 py-3 text-right">
							<div class="flex justify-end gap-2">
								<button
									onclick={() => regenerateLesson(lesson.id)}
									disabled={regeneratingLessonId === lesson.id || deletingLessonId === lesson.id}
									class="rounded px-2.5 py-1 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{regeneratingLessonId === lesson.id ? 'Regenerating…' : 'Regenerate'}
								</button>
								<button
									onclick={() => deleteLesson(lesson.id)}
									disabled={deletingLessonId === lesson.id || regeneratingLessonId === lesson.id}
									class="rounded px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{deletingLessonId === lesson.id ? 'Deleting…' : 'Delete'}
								</button>
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="7" class="px-4 py-10 text-center text-gray-500">
							{selectedLearnerId
								? 'No lessons found for this learner.'
								: 'Select a learner to view lessons.'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
