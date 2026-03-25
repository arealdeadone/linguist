import { json } from '@sveltejs/kit';
import { desc, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { getCostByPeriod, getCostByTask, getCostByUser } from '$lib/server/data/ai-usage';
import { db } from '$lib/server/db';
import { aiUsageLogs } from '$lib/server/schema';
import type { CostGroupBy, PeriodType } from '$lib/types';

const validPeriods = new Set<PeriodType>(['day', 'week', 'month', 'all']);
const validGroups = new Set<CostGroupBy>(['user', 'task', 'model']);

export const GET: RequestHandler = async ({ url }) => {
	try {
		const periodParam = url.searchParams.get('period') as PeriodType | null;
		const groupByParam = url.searchParams.get('groupBy') as CostGroupBy | null;

		if (groupByParam && validGroups.has(groupByParam)) {
			if (groupByParam === 'user') {
				return json(await getCostByUser());
			}

			if (groupByParam === 'task') {
				return json(await getCostByTask());
			}

			const modelCosts = await db
				.select({
					model: aiUsageLogs.model,
					costUsd: sql<number>`coalesce(sum(${aiUsageLogs.costUsd}), 0)`,
					callCount: sql<number>`count(*)::int`,
					avgTokens: sql<number>`coalesce(avg(${aiUsageLogs.inputTokens} + ${aiUsageLogs.outputTokens}), 0)::int`
				})
				.from(aiUsageLogs)
				.groupBy(aiUsageLogs.model)
				.orderBy(desc(sql`sum(${aiUsageLogs.costUsd})`));

			return json(modelCosts);
		}

		if (periodParam && validPeriods.has(periodParam) && periodParam !== 'all') {
			return json(await getCostByPeriod(periodParam));
		}

		return json(await getCostByPeriod('day', 30));
	} catch (error) {
		console.error('Failed to fetch admin costs', error);
		return json({ error: 'Failed to fetch admin costs' }, { status: 500 });
	}
};
