import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { aiJobs } from '$lib/server/schema';
import { eq, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { getRedis } from '$lib/server/redis';

export const GET: RequestHandler = async () => {
	const checks: Record<string, 'ok' | string> = {};
	let postgresHealthy = false;
	let redisHealthy = true;
	let jobsHealthy = false;
	let pendingJobs = 0;

	try {
		await db.execute(sql`SELECT 1`);
		checks.postgres = 'ok';
		postgresHealthy = true;
	} catch (e) {
		checks.postgres = e instanceof Error ? e.message : 'connection failed';
	}

	if (!env.REDIS_URL) {
		checks.redis = 'skipped (REDIS_URL not set)';
	} else {
		try {
			const redis = getRedis();
			if (!redis) {
				checks.redis = 'redis unavailable';
				redisHealthy = false;
			} else {
				const pong = await redis.ping();
				if (pong === 'PONG') {
					checks.redis = 'ok';
				} else {
					checks.redis = `unexpected: ${pong}`;
					redisHealthy = false;
				}
			}
		} catch (e) {
			checks.redis = e instanceof Error ? e.message : 'connection failed';
			redisHealthy = false;
		}
	}

	try {
		const rows = await db
			.select({ pending: sql<number>`count(*)::int` })
			.from(aiJobs)
			.where(eq(aiJobs.status, 'pending'));
		if (rows.length > 0) {
			pendingJobs = rows[0].pending;
		}
		checks.aiJobs = 'ok';
		jobsHealthy = true;
	} catch (e) {
		checks.aiJobs = e instanceof Error ? e.message : 'queue check failed';
	}

	const healthy = postgresHealthy && redisHealthy && jobsHealthy;

	return json(
		{
			status: healthy ? 'healthy' : 'degraded',
			aiMode: env.AI_MODE || 'local',
			queue: { pending: pendingJobs },
			checks
		},
		{ status: healthy ? 200 : 503 }
	);
};
