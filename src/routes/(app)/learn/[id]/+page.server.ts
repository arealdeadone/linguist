import type { PageServerLoad } from './$types';
import { getLessonById, updateLessonStatus } from '$lib/server/data/lessons';
import { getLearnerById } from '$lib/server/data/learners';
import { getVocabByLearnerId } from '$lib/server/data/vocabulary';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, parent, depends }) => {
	depends('data:learner');
	const { learnerId } = await parent();
	const lesson = await getLessonById(params.id);
	if (!lesson) error(404, 'Lesson not found');

	if (lesson.status === 'pending') {
		await updateLessonStatus(params.id, 'in_progress');
	}

	const learner = learnerId ? await getLearnerById(learnerId) : null;
	if (!learner) error(403, 'Not authenticated');
	const allVocab = learnerId ? await getVocabByLearnerId(learnerId) : [];

	return {
		lesson,
		learnerId,
		targetLanguage: learner.targetLanguage,
		lessonLanguage: learner.lessonLanguage,
		allVocab: allVocab.map((v) => ({
			id: v.id,
			word: v.word,
			meaning: v.meaning,
			romanization: v.romanization,
			sceneDescription: v.sceneDescription,
			audioUrl: v.audioUrl
		}))
	};
};
