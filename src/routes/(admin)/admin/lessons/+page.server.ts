import type { PageServerLoad } from './$types';
import { getAllLearners } from '$lib/server/data/learners';
import { getLessonsByLearnerId } from '$lib/server/data/lessons';

function getVocabCount(plan: Record<string, unknown>): number {
	const targets = plan.vocabulary_targets;
	if (!Array.isArray(targets)) return 0;

	let count = 0;
	for (const target of targets) {
		if (typeof target === 'string' && target.trim()) {
			count += 1;
			continue;
		}

		if (typeof target !== 'object' || target === null) {
			continue;
		}

		const word = (target as Record<string, unknown>).word;
		if (typeof word === 'string' && word.trim()) {
			count += 1;
		}
	}

	return count;
}

export const load: PageServerLoad = async ({ url }) => {
	const learners = await getAllLearners();
	const requestedLearnerId = url.searchParams.get('learnerId');
	const selectedLearnerId =
		typeof requestedLearnerId === 'string' &&
		learners.some((learner) => learner.id === requestedLearnerId)
			? requestedLearnerId
			: (learners[0]?.id ?? null);

	if (!selectedLearnerId) {
		return { learners, selectedLearnerId: null, lessons: [] };
	}

	const lessons = await getLessonsByLearnerId(selectedLearnerId, 500);

	return {
		learners,
		selectedLearnerId,
		lessons: lessons.map((lesson) => ({
			id: lesson.id,
			cefrLevel: lesson.cefrLevel,
			week: lesson.week,
			day: lesson.day,
			theme: lesson.theme,
			status: lesson.status,
			createdAt: lesson.createdAt,
			vocabCount: getVocabCount(lesson.plan as Record<string, unknown>)
		}))
	};
};
