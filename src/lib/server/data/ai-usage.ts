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

export async function getAllCostPeriods() {
	const rows = await db
		.select({
			day: sql<string>`to_char(date_trunc('day', ${aiUsageLogs.createdAt}), 'YYYY-MM-DD')`,
			task: aiUsageLogs.task,
			costUsd: sql<number>`coalesce(sum(${aiUsageLogs.costUsd}), 0)`,
			inputTokens: sql<number>`coalesce(sum(${aiUsageLogs.inputTokens}), 0)::int`,
			outputTokens: sql<number>`coalesce(sum(${aiUsageLogs.outputTokens}), 0)::int`,
			callCount: sql<number>`count(*)::int`
		})
		.from(aiUsageLogs)
		.groupBy(sql`date_trunc('day', ${aiUsageLogs.createdAt})`, aiUsageLogs.task)
		.orderBy(desc(sql`date_trunc('day', ${aiUsageLogs.createdAt})`));

	type PeriodEntry = { period: string; costUsd: number; inputTokens: number; outputTokens: number; callCount: number };
	type TaskEntry = { task: string; costUsd: number; callCount: number; avgTokens: number };

	const dailyMap = new Map<string, PeriodEntry>();
	const weeklyMap = new Map<string, PeriodEntry>();
	const monthlyMap = new Map<string, PeriodEntry>();
	const taskMap = new Map<string, { costUsd: number; callCount: number; totalTokens: number }>();

	for (const row of rows) {
		const dayKey = row.day;
		const d = new Date(dayKey);
		const weekStart = new Date(d);
		weekStart.setDate(d.getDate() - d.getDay());
		const weekKey = weekStart.toISOString().slice(0, 10);
		const monthKey = dayKey.slice(0, 7) + '-01';

		for (const [map, key] of [[dailyMap, dayKey], [weeklyMap, weekKey], [monthlyMap, monthKey]] as const) {
			const existing = map.get(key);
			if (existing) {
				existing.costUsd += row.costUsd;
				existing.inputTokens += row.inputTokens;
				existing.outputTokens += row.outputTokens;
				existing.callCount += row.callCount;
			} else {
				map.set(key, {
					period: key,
					costUsd: row.costUsd,
					inputTokens: row.inputTokens,
					outputTokens: row.outputTokens,
					callCount: row.callCount
				});
			}
		}

		const t = taskMap.get(row.task);
		if (t) {
			t.costUsd += row.costUsd;
			t.callCount += row.callCount;
			t.totalTokens += row.inputTokens + row.outputTokens;
		} else {
			taskMap.set(row.task, {
				costUsd: row.costUsd,
				callCount: row.callCount,
				totalTokens: row.inputTokens + row.outputTokens
			});
		}
	}

	const toArray = (m: Map<string, PeriodEntry>, limit: number) =>
		[...m.values()].slice(0, limit);

	const taskCosts: TaskEntry[] = [...taskMap.entries()]
		.map(([task, v]) => ({
			task,
			costUsd: v.costUsd,
			callCount: v.callCount,
			avgTokens: v.callCount > 0 ? Math.round(v.totalTokens / v.callCount) : 0
		}))
		.sort((a, b) => b.costUsd - a.costUsd);

	return {
		dailyCosts: toArray(dailyMap, 30),
		weeklyCosts: toArray(weeklyMap, 12),
		monthlyCosts: toArray(monthlyMap, 6),
		taskCosts
	};
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
