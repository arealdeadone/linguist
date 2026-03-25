import 'dotenv/config';

export const config = {
	databaseUrl: process.env.DATABASE_URL ?? '',
	redisUrl: process.env.REDIS_URL ?? '',
	genaiApiKey: process.env.AGODA_GENAI_API_KEY ?? '',
	genaiBaseUrl: process.env.GENAI_BASE_URL ?? 'https://genai-gateway.agoda.is/v1',
	pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? '2000'),
	maxConcurrentJobs: Number(process.env.MAX_CONCURRENT_JOBS ?? '3'),
	workerId: `worker-${process.pid}`,
	staleJobMinutes: Number(process.env.STALE_JOB_MINUTES ?? '5')
};
