import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import type { AdminStats } from '$lib/types';
import { getAllLearners } from '$lib/server/data/learners';
import { getTotalCost } from '$lib/server/data/ai-usage';
import { db } from '$lib/server/db';
import { aiUsageLogs, lessons, conversations, quizResults } from '$lib/server/schema';

export const GET: RequestHandler = async () => {
	try {
		const [learners, totalCostUsd, costToday, lessonRows, conversationRows, reviewRows] =
			await Promise.all([
				getAllLearners(),
				getTotalCost(),
				getTotalCost(new Date(new Date().toISOString().slice(0, 10))),
				db.select({ count: sql<number>`count(*)::int` }).from(lessons),
				db.select({ count: sql<number>`count(*)::int` }).from(conversations),
				db.select({ count: sql<number>`count(*)::int` }).from(quizResults)
			]);

		const languagePairMap = new Map<
			string,
			{ targetLanguage: string; lessonLanguage: string; count: number }
		>();
		for (const learner of learners) {
			const key = `${learner.targetLanguage}::${learner.lessonLanguage}`;
			const existing = languagePairMap.get(key);
			if (existing) {
				existing.count += 1;
			} else {
				languagePairMap.set(key, {
					targetLanguage: learner.targetLanguage,
					lessonLanguage: learner.lessonLanguage,
					count: 1
				});
			}
		}

		const payload: AdminStats = {
			totalLearners: learners.length,
			languagePairs: [...languagePairMap.values()].sort((a, b) => b.count - a.count),
			totalCostUsd,
			costToday,
			totalLessons: lessonRows[0]?.count ?? 0,
			totalConversations: conversationRows[0]?.count ?? 0,
			totalReviews: reviewRows[0]?.count ?? 0
		};

		return json(payload);
	} catch (error) {
		console.error('Failed to fetch admin stats:', error);
		return json({ error: 'Failed to fetch admin stats' }, { status: 500 });
	}
};
