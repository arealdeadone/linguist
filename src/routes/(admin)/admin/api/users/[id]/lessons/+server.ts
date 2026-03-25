import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLessonsByLearnerId } from '$lib/server/data/lessons';
import { getLessonVocabCount } from './lesson-utils';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const learnerId = params.id;
		const learnerLessons = await getLessonsByLearnerId(learnerId, 500);

		const payload = learnerLessons.map((lesson) => ({
			id: lesson.id,
			learnerId: lesson.learnerId,
			cefrLevel: lesson.cefrLevel,
			week: lesson.week,
			day: lesson.day,
			theme: lesson.theme,
			status: lesson.status,
			createdAt: lesson.createdAt,
			vocabCount: getLessonVocabCount(lesson.plan as Record<string, unknown>)
		}));

		return json(payload);
	} catch (error) {
		console.error('Failed to list learner lessons:', error);
		return json({ error: 'Failed to list learner lessons' }, { status: 500 });
	}
};
