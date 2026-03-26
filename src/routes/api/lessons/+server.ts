import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLessonsByLearnerId, createLesson } from '$lib/server/data/lessons';
import { upsertVocab } from '$lib/server/data/vocabulary';
import { getLearnerById } from '$lib/server/data/learners';
import { getAIService } from '$lib/server/ai-service';

export const GET: RequestHandler = async ({ locals }) => {
	const learnerId = locals.learnerId;
	if (!learnerId) return json({ error: 'Not authenticated' }, { status: 401 });

	const lessons = await getLessonsByLearnerId(learnerId);
	return json(lessons);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const learnerId = locals.learnerId;
	if (!learnerId) return json({ error: 'Not authenticated' }, { status: 401 });

	const body = await request.json();
	const { week, day, theme } = body;

	const learner = await getLearnerById(learnerId);
	if (!learner) return json({ error: 'Learner not found' }, { status: 404 });

	const plan = await getAIService().generateLesson({
		learnerId,
		week: week ?? 1,
		day: day ?? 1,
		theme
	});

	const lesson = await createLesson({
		learnerId,
		cefrLevel: plan.cefr_level,
		week: plan.week,
		day: plan.day,
		theme: plan.theme,
		plan: plan as unknown as Record<string, unknown>
	});

	for (const vocab of plan.vocabulary_targets) {
		await upsertVocab({
			learnerId,
			word: vocab.word,
			romanization: vocab.romanization,
			meaning: vocab.meaning,
			sceneDescription: vocab.scene_description,
			cefrLevel: plan.cefr_level
		});
	}

	return json(lesson, { status: 201 });
};
