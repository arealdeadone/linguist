import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import type { AdminStats } from '$lib/types';
import { getAllLearners } from '$lib/server/data/learners';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	try {
		const [learners, countsRows] = await Promise.all([
			getAllLearners(),
			db.execute(sql`
				SELECT
					coalesce(sum(cost_usd), 0)::float AS total_cost,
					coalesce(sum(CASE WHEN created_at >= CURRENT_DATE THEN cost_usd ELSE 0 END), 0)::float AS cost_today,
					(SELECT count(*)::int FROM lessons) AS total_lessons,
					(SELECT count(*)::int FROM conversations) AS total_conversations,
					(SELECT count(*)::int FROM quiz_results) AS total_reviews
				FROM ai_usage_logs
			`)
		]);

		const counts = (countsRows[0] ?? {}) as Record<string, number>;

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
			totalCostUsd: counts.total_cost ?? 0,
			costToday: counts.cost_today ?? 0,
			totalLessons: counts.total_lessons ?? 0,
			totalConversations: counts.total_conversations ?? 0,
			totalReviews: counts.total_reviews ?? 0
		};

		return json(payload);
	} catch (error) {
		console.error('Failed to fetch admin stats', error);
		return json({ error: 'Failed to fetch admin stats' }, { status: 500 });
	}
};
