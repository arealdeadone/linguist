import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLessonById, updateLessonStatus } from '$lib/server/data/lessons';
import { upsertVocab } from '$lib/server/data/vocabulary';
import type { VocabTarget } from '$lib/types/lesson';

export const GET: RequestHandler = async ({ params }) => {
	const lesson = await getLessonById(params.id);
	if (!lesson) return json({ error: 'Not found' }, { status: 404 });
	return json(lesson);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const { status } = await request.json();
	if (!status) return json({ error: 'status required' }, { status: 400 });

	const lesson = await updateLessonStatus(params.id, status);
	if (!lesson) return json({ error: 'Not found' }, { status: 404 });

	if (status === 'completed') {
		const plan = lesson.plan as Record<string, unknown>;
		const targets = (plan.vocabulary_targets ?? []) as Array<VocabTarget | string>;
		for (const vocab of targets) {
			if (typeof vocab === 'string') {
				await upsertVocab({
					learnerId: lesson.learnerId,
					word: vocab,
					cefrLevel: (plan.cefr_level as string) ?? 'A1'
				});
			} else {
				await upsertVocab({
					learnerId: lesson.learnerId,
					word: vocab.word,
					romanization: vocab.romanization,
					meaning: vocab.meaning,
					sceneDescription: vocab.scene_description,
					cefrLevel: (plan.cefr_level as string) ?? 'A1'
				});
			}
		}
	}

	return json(lesson);
};
