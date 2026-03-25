import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getVocabByLearnerId, getVocabCount, getDueCount } from '$lib/server/data/vocabulary';
import { getLessonsByLearnerId } from '$lib/server/data/lessons';
import { getQuizHistory } from '$lib/server/data/quiz-results';
import { getConversationsByLearnerId } from '$lib/server/data/conversations';

export const load: PageServerLoad = async ({ parent, depends }) => {
	depends('data:learner');
	const { learnerId } = await parent();
	if (!learnerId) redirect(302, '/');

	const [allVocab, totalCards, dueCount, lessons, quizzes, conversations] = await Promise.all([
		getVocabByLearnerId(learnerId),
		getVocabCount(learnerId),
		getDueCount(learnerId),
		getLessonsByLearnerId(learnerId),
		getQuizHistory(learnerId, 50),
		getConversationsByLearnerId(learnerId, 20)
	]);

	const learning = allVocab.filter((v) => v.sm2Interval < 6).length;
	const reviewing = allVocab.filter((v) => v.sm2Interval >= 6 && v.sm2Interval <= 30).length;
	const mastered = allVocab.filter((v) => v.sm2Interval > 30).length;

	const weakWords = [...allVocab]
		.sort((a, b) => a.sm2Ef - b.sm2Ef)
		.slice(0, 10)
		.map((v) => ({
			id: v.id,
			word: v.word,
			romanization: v.romanization,
			meaning: v.meaning,
			ef: Math.round(v.sm2Ef * 100) / 100
		}));

	const modalityTotals = allVocab.reduce(
		(acc, v) => {
			const scores = v.modalityScores as {
				listening: number;
				speaking: number;
				contextual: number;
			};
			return {
				listening: acc.listening + scores.listening,
				speaking: acc.speaking + scores.speaking,
				contextual: acc.contextual + scores.contextual
			};
		},
		{ listening: 0, speaking: 0, contextual: 0 }
	);
	const count = allVocab.length || 1;
	const modalityAverages = {
		listening: Math.round((modalityTotals.listening / count) * 100) / 100,
		speaking: Math.round((modalityTotals.speaking / count) * 100) / 100,
		contextual: Math.round((modalityTotals.contextual / count) * 100) / 100
	};

	const completedLessons = lessons.filter((l) => l.status === 'completed').length;
	const completedConversations = conversations.filter((c) => c.completedAt).length;
	const averageQuizScore =
		quizzes.length > 0
			? Math.round(quizzes.reduce((sum, q) => sum + (q.score ?? 0), 0) / quizzes.length)
			: 0;

	return {
		totalCards,
		dueCount,
		learning,
		reviewing,
		mastered,
		weakWords,
		modalityAverages,
		completedLessons,
		totalLessons: lessons.length,
		completedConversations,
		averageQuizScore,
		totalQuizzes: quizzes.length
	};
};
