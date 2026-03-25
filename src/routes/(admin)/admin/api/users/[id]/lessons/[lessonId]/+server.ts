import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLessonById } from '$lib/server/data/lessons';
import { deleteLessonAndOrphanedVocab } from '../lesson-utils';

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const lesson = await getLessonById(params.lessonId);

		if (!lesson || lesson.learnerId !== params.id) {
			return json({ error: 'Lesson not found' }, { status: 404 });
		}

		const removedVocabulary = await deleteLessonAndOrphanedVocab(lesson);

		return json({
			ok: true,
			deletedLessonId: lesson.id,
			removedVocabulary,
			removedVocabularyCount: removedVocabulary.length
		});
	} catch (error) {
		console.error('Failed to delete lesson:', error);
		return json({ error: 'Failed to delete lesson' }, { status: 500 });
	}
};
