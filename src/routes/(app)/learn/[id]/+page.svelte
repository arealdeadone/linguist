<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import LessonPlayer from '$lib/components/LessonPlayer.svelte';
	import type { PageData } from './$types';
	import type { LessonPlan } from '$lib/types/lesson';

	let { data }: { data: PageData } = $props();

	const lesson = data.lesson;
	const plan = lesson.plan as unknown as LessonPlan;
	const learnerId = data.learnerId as string;
	const targetLanguage = data.targetLanguage as string;
	const lessonLanguage = data.lessonLanguage as string;
	const allVocab = data.allVocab as Array<{
		id: string;
		word: string;
		meaning: string | null;
		romanization: string | null;
		sceneDescription: string | null;
		audioUrl: string | null;
	}>;
	const initialStep = parseInt($page.url.searchParams.get('step') ?? '0') || 0;

	onMount(() => {
		if ($page.url.searchParams.has('step')) {
			goto(`/learn/${lesson.id}`, { replaceState: true });
		}
	});
</script>

<div class="mx-auto max-w-2xl">
	<div class="mb-4 flex items-center gap-3">
		<a
			href="/learn"
			aria-label="Back to lessons"
			class="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-200 transition-colors hover:bg-gray-50"
		>
			<svg
				class="h-5 w-5 text-gray-600"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M19 12H5M12 19l-7-7 7-7" />
			</svg>
		</a>
		<div>
			<h1 class="text-lg font-bold text-gray-900">
				{#if plan.week && plan.day}
					Week {plan.week}, Day {plan.day}
				{:else}
					Lesson
				{/if}
			</h1>
			{#if plan.theme}
				<p class="text-sm text-gray-500">{plan.theme}</p>
			{/if}
		</div>
	</div>

	<LessonPlayer
		{plan}
		lessonId={lesson.id}
		{learnerId}
		{initialStep}
		{targetLanguage}
		{lessonLanguage}
		{allVocab}
	/>
</div>
