import type { PageServerLoad } from './$types';
import { getCostByPeriod, getCostByTask, getTotalCost } from '$lib/server/data/ai-usage';
import { getAllLearners } from '$lib/server/data/learners';
import { db } from '$lib/server/db';
import { aiUsageLogs, lessons, conversations } from '$lib/server/schema';
import { sql } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const startOfToday = new Date();
	startOfToday.setHours(0, 0, 0, 0);

	const [totalCost, costToday, statsRows, dailyCosts, weeklyCosts, monthlyCosts, taskCosts, learners, lessonCountRows, conversationCountRows] =
		await Promise.all([
			getTotalCost(),
			getTotalCost(startOfToday),
			db
				.select({
					totalCalls: sql<number>`count(*)::int`,
					totalTokens: sql<number>`coalesce(sum(${aiUsageLogs.inputTokens}) + sum(${aiUsageLogs.outputTokens}), 0)::int`
				})
				.from(aiUsageLogs),
			getCostByPeriod('day', 30),
			getCostByPeriod('week', 12),
			getCostByPeriod('month', 6),
			getCostByTask(),
			getAllLearners(),
			db.select({ count: sql<number>`count(*)::int` }).from(lessons),
			db.select({ count: sql<number>`count(*)::int` }).from(conversations)
		]);

	const langPairs = new Map<string, number>();
	for (const l of learners) {
		const key = `${l.targetLanguage}/${l.lessonLanguage}`;
		langPairs.set(key, (langPairs.get(key) ?? 0) + 1);
	}

	return {
		stats: {
			totalCalls: statsRows[0]?.totalCalls ?? 0,
			totalTokens: statsRows[0]?.totalTokens ?? 0,
			totalCost,
			costToday,
			totalLessons: lessonCountRows[0]?.count ?? 0,
			totalConversations: conversationCountRows[0]?.count ?? 0
		},
		dailyCosts,
		weeklyCosts,
		monthlyCosts,
		taskCosts,
		learnerCount: learners.length,
		languagePairs: Array.from(langPairs.entries()).map(([pair, count]) => ({ pair, count }))
	};
};
