import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAIService } from '$lib/server/ai-service';
import { createLesson, getLessonById } from '$lib/server/data/lessons';
import { upsertVocab } from '$lib/server/data/vocabulary';
import type { VocabTarget } from '$lib/types';
import { deleteLessonAndOrphanedVocab } from '../../lesson-utils';

export const POST: RequestHandler = async ({ params }) => {
	try {
		const oldLesson = await getLessonById(params.lessonId);
		if (!oldLesson || oldLesson.learnerId !== params.id) {
			return json({ error: 'Lesson not found' }, { status: 404 });
		}

		const week = oldLesson.week ?? 1;
		const day = oldLesson.day ?? 1;

		await deleteLessonAndOrphanedVocab(oldLesson);

		const plan = await getAIService().generateLesson({
			learnerId: params.id,
			week,
			day,
			theme: oldLesson.theme ?? undefined
		});

		const newLesson = await createLesson({
			learnerId: params.id,
			cefrLevel: plan.cefr_level,
			week: plan.week,
			day: plan.day,
			theme: plan.theme,
			plan: plan as unknown as Record<string, unknown>
		});

		for (const vocab of plan.vocabulary_targets) {
			const vocabTarget = vocab as VocabTarget;
			await upsertVocab({
				learnerId: params.id,
				word: vocabTarget.word,
				romanization: vocabTarget.romanization,
				meaning: vocabTarget.meaning,
				sceneDescription: vocabTarget.scene_description,
				cefrLevel: plan.cefr_level
			});
		}

		return json({ ok: true, lesson: newLesson });
	} catch (error) {
		console.error('Failed to regenerate lesson:', error);
		return json({ error: 'Failed to regenerate lesson' }, { status: 500 });
	}
};
