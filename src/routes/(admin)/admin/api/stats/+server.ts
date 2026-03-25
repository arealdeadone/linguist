import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import type { AdminStats } from '$lib/types';
import { getAllLearners } from '$lib/server/data/learners';
import { getTotalCost } from '$lib/server/data/ai-usage';
import { db } from '$lib/server/db';
import { conversations, lessons, quizResults } from '$lib/server/schema';

export const GET: RequestHandler = async () => {
	try {
		const startOfToday = new Date();
		startOfToday.setHours(0, 0, 0, 0);

		const [
			allLearners,
			totalCostUsd,
			costToday,
			lessonCountRows,
			conversationCountRows,
			reviewCountRows
		] = await Promise.all([
			getAllLearners(),
			getTotalCost(),
			getTotalCost(startOfToday),
			db.select({ count: sql<number>`count(*)::int` }).from(lessons),
			db.select({ count: sql<number>`count(*)::int` }).from(conversations),
			db.select({ count: sql<number>`count(*)::int` }).from(quizResults)
		]);

		const languagePairMap = new Map<
			string,
			{ targetLanguage: string; lessonLanguage: string; count: number }
		>();
		for (const learner of allLearners) {
			const key = `${learner.targetLanguage}::${learner.lessonLanguage}`;
			const existing = languagePairMap.get(key);
			if (existing) {
				existing.count += 1;
				continue;
			}

			languagePairMap.set(key, {
				targetLanguage: learner.targetLanguage,
				lessonLanguage: learner.lessonLanguage,
				count: 1
			});
		}

		const payload: AdminStats = {
			totalLearners: allLearners.length,
			languagePairs: [...languagePairMap.values()].sort((a, b) => b.count - a.count),
			totalCostUsd,
			costToday,
			totalLessons: lessonCountRows[0].count,
			totalConversations: conversationCountRows[0].count,
			totalReviews: reviewCountRows[0].count
		};

		return json(payload);
	} catch (error) {
		console.error('Failed to fetch admin stats', error);
		return json({ error: 'Failed to fetch admin stats' }, { status: 500 });
	}
};
