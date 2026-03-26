import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import type { AdminStats } from '$lib/types';
import { getAllLearners } from '$lib/server/data/learners';
import { db } from '$lib/server/db';
import { aiUsageLogs } from '$lib/server/schema';

export const GET: RequestHandler = async () => {
	try {
		const [learners, costRows, countRows] = await Promise.all([
			getAllLearners(),
			db
				.select({
					totalCost: sql<number>`coalesce(sum(${aiUsageLogs.costUsd}), 0)`,
					costToday: sql<number>`coalesce(sum(CASE WHEN ${aiUsageLogs.createdAt} >= CURRENT_DATE THEN ${aiUsageLogs.costUsd} ELSE 0 END), 0)`
				})
				.from(aiUsageLogs),
			db.execute(sql`
				SELECT
					(SELECT count(*)::int FROM lessons) AS total_lessons,
					(SELECT count(*)::int FROM conversations) AS total_conversations,
					(SELECT count(*)::int FROM quiz_results) AS total_reviews
			`)
		]);

		const costs = costRows[0] ?? { totalCost: 0, costToday: 0 };
		const counts = (countRows[0] ?? {}) as Record<string, number>;

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
			totalCostUsd: costs.totalCost,
			costToday: costs.costToday,
			totalLessons: counts.total_lessons ?? 0,
			totalConversations: counts.total_conversations ?? 0,
			totalReviews: counts.total_reviews ?? 0
		};

		return json(payload);
	} catch (error) {
		console.error('Failed to fetch admin stats:', error);
		return json({ error: 'Failed to fetch admin stats' }, { status: 500 });
	}
};
