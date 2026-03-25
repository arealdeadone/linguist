import { desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db';
import { aiUsageLogs, learners } from '../schema';

export async function insertUsageLog(data: {
	learnerId?: string;
	task: string;
	model: string;
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
	durationMs?: number;
	metadata?: Record<string, unknown>;
}) {
	const rows = await db.insert(aiUsageLogs).values(data).returning();
	return rows[0];
}

export async function getCostByPeriod(period: 'day' | 'week' | 'month', limit = 30) {
	const periodBucket =
		period === 'day'
			? sql`date_trunc('day', ${aiUsageLogs.createdAt})`
			: period === 'week'
				? sql`date_trunc('week', ${aiUsageLogs.createdAt})`
				: sql`date_trunc('month', ${aiUsageLogs.createdAt})`;

	return db
		.select({
			period: sql<string>`to_char(${periodBucket}, 'YYYY-MM-DD')`,
			costUsd: sql<number>`coalesce(sum(${aiUsageLogs.costUsd}), 0)`,
			inputTokens: sql<number>`coalesce(sum(${aiUsageLogs.inputTokens}), 0)::int`,
			outputTokens: sql<number>`coalesce(sum(${aiUsageLogs.outputTokens}), 0)::int`,
			callCount: sql<number>`count(*)::int`
		})
		.from(aiUsageLogs)
		.groupBy(periodBucket)
		.orderBy(desc(periodBucket))
		.limit(limit);
}

export async function getCostByUser() {
	return db
		.select({
			learnerId: aiUsageLogs.learnerId,
			learnerName: sql<string>`coalesce(${learners.name}, 'Unknown')`,
			totalCost: sql<number>`coalesce(sum(${aiUsageLogs.costUsd}), 0)`,
			lessonCost: sql<number>`coalesce(sum(case when ${aiUsageLogs.task} = 'lesson_generation' then ${aiUsageLogs.costUsd} else 0 end), 0)`,
			conversationCost: sql<number>`coalesce(sum(case when ${aiUsageLogs.task} = 'conversation' then ${aiUsageLogs.costUsd} else 0 end), 0)`,
			reviewCost: sql<number>`coalesce(sum(case when ${aiUsageLogs.task} = 'review' then ${aiUsageLogs.costUsd} else 0 end), 0)`,
			callCount: sql<number>`count(*)::int`
		})
		.from(aiUsageLogs)
		.leftJoin(learners, eq(aiUsageLogs.learnerId, learners.id))
		.groupBy(aiUsageLogs.learnerId, learners.name)
		.orderBy(desc(sql`sum(${aiUsageLogs.costUsd})`));
}

export async function getCostByTask() {
	return db
		.select({
			task: aiUsageLogs.task,
			costUsd: sql<number>`coalesce(sum(${aiUsageLogs.costUsd}), 0)`,
			callCount: sql<number>`count(*)::int`,
			avgTokens: sql<number>`coalesce(avg(${aiUsageLogs.inputTokens} + ${aiUsageLogs.outputTokens}), 0)::int`
		})
		.from(aiUsageLogs)
		.groupBy(aiUsageLogs.task)
		.orderBy(desc(sql`sum(${aiUsageLogs.costUsd})`));
}

export async function getTotalCost(since?: Date) {
	const query = db
		.select({
			totalCost: sql<number>`coalesce(sum(${aiUsageLogs.costUsd}), 0)`
		})
		.from(aiUsageLogs);
	const rows = since ? await query.where(gte(aiUsageLogs.createdAt, since)) : await query;

	return rows[0].totalCost;
}

export async function getUsageStats() {
	const startOfToday = new Date();
	startOfToday.setUTCHours(0, 0, 0, 0);

	const rows = await db.execute(sql`
		SELECT
			count(*)::int as "totalCalls",
			coalesce(sum(input_tokens), 0)::int as "totalInputTokens",
			coalesce(sum(output_tokens), 0)::int as "totalOutputTokens",
			coalesce(sum(cost_usd), 0)::float as "totalCost",
			coalesce(sum(case when created_at >= ${startOfToday} then cost_usd else 0 end), 0)::float as "costToday"
		FROM ai_usage_logs
	`);

	const r = rows[0] as Record<string, unknown>;

	return {
		totalCalls: Number(r.totalCalls),
		totalInputTokens: Number(r.totalInputTokens),
		totalOutputTokens: Number(r.totalOutputTokens),
		totalTokens: Number(r.totalInputTokens) + Number(r.totalOutputTokens),
		totalCost: Number(r.totalCost),
		costToday: Number(r.costToday)
	};
}
