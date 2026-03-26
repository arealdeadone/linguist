import type { PageServerLoad } from './$types';
import { getAllLearners } from '$lib/server/data/learners';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const [learners, statsRows] = await Promise.all([
		getAllLearners(),
		db.execute(sql`
			SELECT
				(SELECT count(*)::int FROM ai_usage_logs) AS total_calls,
				(SELECT coalesce(sum(input_tokens) + sum(output_tokens), 0)::int FROM ai_usage_logs) AS total_tokens,
				(SELECT coalesce(sum(cost_usd), 0)::float FROM ai_usage_logs) AS total_cost,
				(SELECT coalesce(sum(cost_usd), 0)::float FROM ai_usage_logs WHERE created_at >= CURRENT_DATE) AS cost_today,
				(SELECT count(*)::int FROM lessons) AS total_lessons,
				(SELECT count(*)::int FROM conversations) AS total_conversations
		`)
	]);

	const stats = (statsRows[0] ?? {}) as Record<string, number>;

	const langPairs = new Map<string, number>();
	for (const l of learners) {
		const key = `${l.targetLanguage}/${l.lessonLanguage}`;
		langPairs.set(key, (langPairs.get(key) ?? 0) + 1);
	}

	return {
		stats: {
			totalCalls: stats.total_calls ?? 0,
			totalTokens: stats.total_tokens ?? 0,
			totalCost: stats.total_cost ?? 0,
			costToday: stats.cost_today ?? 0,
			totalLessons: stats.total_lessons ?? 0,
			totalConversations: stats.total_conversations ?? 0
		},
		learnerCount: learners.length,
		languagePairs: Array.from(langPairs.entries()).map(([pair, count]) => ({ pair, count }))
	};
};
