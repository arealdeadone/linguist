import type { PageServerLoad } from './$types';
import { getTotalCost, getCostByPeriod, getCostByTask } from '$lib/server/data/ai-usage';
import { getAllLearners } from '$lib/server/data/learners';
import { db } from '$lib/server/db';
import { aiUsageLogs, lessons, conversations } from '$lib/server/schema';
import { sql } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const startOfToday = new Date();
	startOfToday.setHours(0, 0, 0, 0);

	const [
		totalCost,
		costToday,
		callCountRows,
		tokenRows,
		dailyCosts,
		weeklyCosts,
		monthlyCosts,
		taskCosts,
		learners,
		lessonCountRows,
		conversationCountRows
	] = await Promise.all([
		getTotalCost(),
		getTotalCost(startOfToday),
		db.select({ count: sql<number>`count(*)::int` }).from(aiUsageLogs),
		db
			.select({
				input: sql<number>`coalesce(sum(input_tokens), 0)::int`,
				output: sql<number>`coalesce(sum(output_tokens), 0)::int`
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

	const totalCalls = callCountRows[0].count;
	const totalTokens = tokenRows[0].input + tokenRows[0].output;

	const langPairs = new Map<string, number>();
	for (const l of learners) {
		const key = `${l.targetLanguage}/${l.lessonLanguage}`;
		langPairs.set(key, (langPairs.get(key) ?? 0) + 1);
	}

	return {
		stats: {
			totalCalls,
			totalTokens,
			totalCost,
			costToday,
			totalLessons: lessonCountRows[0].count,
			totalConversations: conversationCountRows[0].count
		},
		dailyCosts,
		weeklyCosts,
		monthlyCosts,
		taskCosts,
		learnerCount: learners.length,
		languagePairs: Array.from(langPairs.entries()).map(([pair, count]) => ({ pair, count }))
	};
};
